use axum_test::TestServer;
use axum_test::multipart::{MultipartForm, Part};
use jsonwebtoken::{EncodingKey, Header, encode};
use serde_json::{json, Value};
use server::AppState;
use server::config::AppConfig;
use surrealdb::Surreal;
use surrealdb::engine::any::Any;

fn test_config() -> AppConfig {
    AppConfig {
        host: [127, 0, 0, 1].into(),
        port: 0,
        dist_path: "dist".into(),
        surrealdb_url: "mem://".into(),
        surrealdb_ns: "test".into(),
        surrealdb_db: "test".into(),
        surrealdb_user: String::new(),
        surrealdb_pass: String::new(),
        github_client_id: String::new(),
        github_client_secret: String::new(),
        jwt_secret: "test-secret".into(),
        admin_github_usernames: vec!["testuser".into()],
        app_url: "http://localhost:8080".into(),
        uploads_path: "/tmp/scylla-test-uploads".into(),
    }
}

async fn test_db() -> Surreal<Any> {
    let db = surrealdb::engine::any::connect("mem://").await.unwrap();
    db.use_ns("test").use_db("test").await.unwrap();
    db.query(include_str!("../src/db/schema.surql"))
        .await
        .unwrap();
    db
}

/// Create a test app with in-memory SurrealDB
async fn test_app() -> TestServer {
    let db = test_db().await;
    let state = AppState {
        db,
        config: test_config(),
    };
    let api = server::api_router(state);
    TestServer::new(api).unwrap()
}

/// Create a test app + return the DB handle for direct DB operations (scheduler tests)
async fn test_app_with_db() -> (TestServer, Surreal<Any>) {
    let db = test_db().await;
    let state = AppState {
        db: db.clone(),
        config: test_config(),
    };
    let api = server::api_router(state);
    (TestServer::new(api).unwrap(), db)
}

/// Generate a valid JWT for test requests
fn test_jwt(secret: &str) -> String {
    let claims = json!({
        "sub": "testuser",
        "name": "Test User",
        "avatar_url": "https://example.com/avatar.png",
        "exp": chrono::Utc::now().timestamp() + 3600,
    });
    let key = EncodingKey::from_secret(secret.as_bytes());
    encode(&Header::default(), &claims, &key).unwrap()
}

// ─── Health ───────────────────────────────────────────────────────────────────

#[tokio::test]
async fn health_check() {
    let server = test_app().await;
    let res = server.get("/health").await;
    res.assert_status_ok();
}

// ─── Public Posts ─────────────────────────────────────────────────────────────

#[tokio::test]
async fn list_posts_empty() {
    let server = test_app().await;
    let res = server.get("/posts").add_query_param("locale", "en").await;
    res.assert_status_ok();
    let body: Value = res.json();
    assert_eq!(body["total"], 0);
    assert!(body["posts"].as_array().unwrap().is_empty());
}

#[tokio::test]
async fn get_post_not_found() {
    let server = test_app().await;
    let res = server
        .get("/posts/nonexistent")
        .add_query_param("locale", "en")
        .await;
    res.assert_status(axum::http::StatusCode::NOT_FOUND);
}

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

#[tokio::test]
async fn create_and_get_post() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    // Create a draft post
    let create_body = json!({
        "slug": "test-post",
        "locale": "en",
        "title": "Test Post",
        "summary": "A test post",
        "content": "Hello world this is a test post with enough words to have a reading time.",
        "tags": ["test"],
        "image": null,
        "authors": ["testuser"],
        "status": "draft",
        "published_at": null
    });

    let res = server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&create_body)
        .await;
    res.assert_status_ok();

    let post: Value = res.json();
    assert_eq!(post["slug"], "test-post");
    assert_eq!(post["status"], "draft");
    assert_eq!(post["reading_time"], 1);

    // Draft should NOT appear in public list
    let res = server.get("/posts").add_query_param("locale", "en").await;
    let body: Value = res.json();
    assert!(body["posts"].as_array().unwrap().is_empty(), "Draft should not be visible publicly");

    // Draft SHOULD appear via admin get
    let res = server
        .get("/admin/posts/test-post")
        .add_query_param("locale", "en")
        .authorization_bearer(&token)
        .await;
    res.assert_status_ok();
    let post: Value = res.json();
    assert_eq!(post["title"], "Test Post");
}

#[tokio::test]
async fn create_publish_and_list() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let body = json!({
        "slug": "published-post",
        "locale": "en",
        "title": "Published Post",
        "summary": "Visible post",
        "content": "Content here",
        "tags": ["devblog"],
        "image": null,
        "authors": [],
        "status": "published",
        "published_at": null
    });

    server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status_ok();

    // Should appear in public list
    let res = server.get("/posts").add_query_param("locale", "en").await;
    res.assert_status_ok();
    let body: Value = res.json();
    let posts = body["posts"].as_array().unwrap();
    assert_eq!(posts.len(), 1);
    assert_eq!(posts[0]["slug"], "published-post");
    assert_eq!(posts[0]["reading_time"], 1);
    assert_eq!(body["total"], 1);

    // Should be accessible by slug
    let res = server
        .get("/posts/published-post")
        .add_query_param("locale", "en")
        .await;
    res.assert_status_ok();
    let post: Value = res.json();
    assert_eq!(post["title"], "Published Post");
}

#[tokio::test]
async fn update_post() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    // Create
    let body = json!({
        "slug": "update-me",
        "locale": "en",
        "title": "Original",
        "summary": "Original summary",
        "content": "Original content",
        "tags": [],
        "image": null,
        "authors": [],
        "status": "draft",
        "published_at": null
    });
    server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status_ok();

    // Update
    let updated = json!({
        "slug": "update-me",
        "locale": "en",
        "title": "Updated Title",
        "summary": "Updated summary",
        "content": "Updated content with more words so reading time might change slightly",
        "tags": ["updated"],
        "image": null,
        "authors": ["testuser"],
        "status": "published",
        "published_at": null
    });
    let res = server
        .put("/admin/posts/update-me")
        .authorization_bearer(&token)
        .json(&updated)
        .await;
    res.assert_status_ok();
    let post: Value = res.json();
    assert_eq!(post["title"], "Updated Title");
    assert_eq!(post["status"], "published");
}

#[tokio::test]
async fn delete_post() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    // Create
    let body = json!({
        "slug": "delete-me",
        "locale": "en",
        "title": "Delete Me",
        "summary": "Will be deleted",
        "content": "Bye bye",
        "tags": [],
        "image": null,
        "authors": [],
        "status": "published",
        "published_at": null
    });
    server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status_ok();

    // Delete
    let res = server
        .delete("/admin/posts/delete-me")
        .add_query_param("locale", "en")
        .authorization_bearer(&token)
        .await;
    res.assert_status_ok();

    // Should be gone
    let res = server
        .get("/posts/delete-me")
        .add_query_param("locale", "en")
        .await;
    res.assert_status(axum::http::StatusCode::NOT_FOUND);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

#[tokio::test]
async fn admin_requires_auth() {
    let server = test_app().await;

    // No token → 401
    let res = server.get("/admin/posts").await;
    res.assert_status(axum::http::StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn admin_rejects_invalid_token() {
    let server = test_app().await;
    let bad_token = test_jwt("wrong-secret");

    let res = server
        .get("/admin/posts")
        .authorization_bearer(&bad_token)
        .await;
    res.assert_status(axum::http::StatusCode::UNAUTHORIZED);
}

// ─── Locale ───────────────────────────────────────────────────────────────────

#[tokio::test]
async fn posts_filtered_by_locale() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    // Create EN post
    let en = json!({
        "slug": "bilingual",
        "locale": "en",
        "title": "English Post",
        "summary": "In English",
        "content": "Content",
        "tags": [],
        "image": null,
        "authors": [],
        "status": "published",
        "published_at": null
    });
    server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&en)
        .await
        .assert_status_ok();

    // Create FR post (same slug, different locale)
    let fr = json!({
        "slug": "bilingual",
        "locale": "fr",
        "title": "Article Francais",
        "summary": "En francais",
        "content": "Contenu",
        "tags": [],
        "image": null,
        "authors": [],
        "status": "published",
        "published_at": null
    });
    server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&fr)
        .await
        .assert_status_ok();

    // List EN → only EN
    let res = server.get("/posts").add_query_param("locale", "en").await;
    let body: Value = res.json();
    let posts = body["posts"].as_array().unwrap();
    assert_eq!(posts.len(), 1);
    assert_eq!(posts[0]["title"], "English Post");

    // List FR → only FR
    let res = server.get("/posts").add_query_param("locale", "fr").await;
    let body: Value = res.json();
    let posts = body["posts"].as_array().unwrap();
    assert_eq!(posts.len(), 1);
    assert_eq!(posts[0]["title"], "Article Francais");

    // Admin list → both
    let res = server
        .get("/admin/posts")
        .authorization_bearer(&token)
        .await;
    let posts: Vec<Value> = res.json();
    assert_eq!(posts.len(), 2);
}

// ─── Tag Filter ───────────────────────────────────────────────────────────────

#[tokio::test]
async fn posts_filtered_by_tag() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let post1 = json!({
        "slug": "tagged-1",
        "locale": "en",
        "title": "Devblog Post",
        "summary": "S",
        "content": "C",
        "tags": ["devblog"],
        "image": null,
        "authors": [],
        "status": "published",
        "published_at": null
    });
    let post2 = json!({
        "slug": "tagged-2",
        "locale": "en",
        "title": "Announcement",
        "summary": "S",
        "content": "C",
        "tags": ["announcement"],
        "image": null,
        "authors": [],
        "status": "published",
        "published_at": null
    });

    server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&post1)
        .await;
    server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&post2)
        .await;

    // Filter by tag
    let res = server
        .get("/posts")
        .add_query_param("locale", "en")
        .add_query_param("tag", "devblog")
        .await;
    let body: Value = res.json();
    let posts = body["posts"].as_array().unwrap();
    assert_eq!(posts.len(), 1);
    assert_eq!(posts[0]["slug"], "tagged-1");
}

// ─── RSS ──────────────────────────────────────────────────────────────────────

#[tokio::test]
async fn rss_feed() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let body = json!({
        "slug": "rss-post",
        "locale": "en",
        "title": "RSS Post",
        "summary": "For RSS",
        "content": "# Hello\nRSS content",
        "tags": ["test"],
        "image": null,
        "authors": [],
        "status": "published",
        "published_at": null
    });
    server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&body)
        .await;

    let res = server.get("/rss").add_query_param("locale", "en").await;
    res.assert_status_ok();
    let body = res.text();
    assert!(body.contains("<title>RSS Post</title>"));
    assert!(body.contains("RSS content"));
}

// ─── Scheduled Publication ────────────────────────────────────────────────────

#[tokio::test]
async fn scheduled_post_not_publicly_visible() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let future_date = (chrono::Utc::now() + chrono::Duration::days(1)).to_rfc3339();

    let body = json!({
        "slug": "future-post",
        "locale": "en",
        "title": "Future Post",
        "summary": "Not yet",
        "content": "Will be published later",
        "tags": [],
        "image": null,
        "authors": [],
        "status": "scheduled",
        "published_at": future_date
    });
    server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status_ok();

    // Not in public list
    let res = server.get("/posts").add_query_param("locale", "en").await;
    let body: Value = res.json();
    assert!(body["posts"].as_array().unwrap().is_empty(), "Scheduled post should not be visible publicly");

    // Visible via admin
    let res = server
        .get("/admin/posts/future-post")
        .add_query_param("locale", "en")
        .authorization_bearer(&token)
        .await;
    res.assert_status_ok();
    let post: Value = res.json();
    assert_eq!(post["status"], "scheduled");
}

// ─── Reading Time ─────────────────────────────────────────────────────────────

#[tokio::test]
async fn reading_time_calculated() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    // ~400 words → 2 min
    let long_content = "word ".repeat(400);
    let body = json!({
        "slug": "long-post",
        "locale": "en",
        "title": "Long Post",
        "summary": "S",
        "content": long_content,
        "tags": [],
        "image": null,
        "authors": [],
        "status": "published",
        "published_at": null
    });

    let res = server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&body)
        .await;
    res.assert_status_ok();
    let post: Value = res.json();
    assert_eq!(post["reading_time"], 2);
}

// ─── Scheduler: publish_due_posts ─────────────────────────────────────────────

#[tokio::test]
async fn scheduler_publishes_past_due_posts() {
    let (server, db) = test_app_with_db().await;
    let token = test_jwt("test-secret");

    // Create a scheduled post with published_at in the past
    let past_date = (chrono::Utc::now() - chrono::Duration::minutes(5)).to_rfc3339();
    let body = json!({
        "slug": "past-due",
        "locale": "en",
        "title": "Past Due Post",
        "summary": "Should be auto-published",
        "content": "Content",
        "tags": [],
        "image": null,
        "authors": [],
        "status": "scheduled",
        "published_at": past_date
    });
    server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status_ok();

    // Not publicly visible yet (status = scheduled)
    let res = server.get("/posts").add_query_param("locale", "en").await;
    let body: Value = res.json();
    assert!(body["posts"].as_array().unwrap().is_empty(), "Scheduled post should not be public before scheduler runs");

    // Run the scheduler
    let count = server::scheduler::publish_due_posts(&db).await.unwrap();
    assert_eq!(count, 1, "Scheduler should have published 1 post");

    // Now publicly visible
    let res = server.get("/posts").add_query_param("locale", "en").await;
    let body: Value = res.json();
    let posts = body["posts"].as_array().unwrap();
    assert_eq!(posts.len(), 1);
    assert_eq!(posts[0]["slug"], "past-due");
    assert_eq!(posts[0]["status"], "published");
}

#[tokio::test]
async fn scheduler_ignores_future_posts() {
    let (server, db) = test_app_with_db().await;
    let token = test_jwt("test-secret");

    // Create a scheduled post with published_at in the future
    let future_date = (chrono::Utc::now() + chrono::Duration::days(7)).to_rfc3339();
    let body = json!({
        "slug": "future-scheduled",
        "locale": "en",
        "title": "Future Scheduled",
        "summary": "Not due yet",
        "content": "Content",
        "tags": [],
        "image": null,
        "authors": [],
        "status": "scheduled",
        "published_at": future_date
    });
    server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status_ok();

    // Run the scheduler — should not publish anything
    let count = server::scheduler::publish_due_posts(&db).await.unwrap();
    assert_eq!(count, 0, "Scheduler should not publish future posts");

    // Still not public
    let res = server.get("/posts").add_query_param("locale", "en").await;
    let body: Value = res.json();
    assert!(body["posts"].as_array().unwrap().is_empty());

    // Still scheduled in admin
    let res = server
        .get("/admin/posts/future-scheduled")
        .add_query_param("locale", "en")
        .authorization_bearer(&token)
        .await;
    let post: Value = res.json();
    assert_eq!(post["status"], "scheduled");
}

#[tokio::test]
async fn scheduler_ignores_drafts_and_published() {
    let (_server, db) = test_app_with_db().await;

    // Directly insert a draft and a published post via DB
    db.query(
        "CREATE post CONTENT {
            slug: 'draft-post', locale: 'en', title: 'Draft', summary: 'S',
            content: 'C', tags: [], authors: [], reading_time: 1,
            status: 'draft', published_at: NONE,
            created_at: time::now(), updated_at: time::now()
        };
        CREATE post CONTENT {
            slug: 'already-pub', locale: 'en', title: 'Published', summary: 'S',
            content: 'C', tags: [], authors: [], reading_time: 1,
            status: 'published', published_at: NONE,
            created_at: time::now(), updated_at: time::now()
        };",
    )
    .await
    .unwrap();

    // Scheduler should not touch drafts or already-published posts
    let count = server::scheduler::publish_due_posts(&db).await.unwrap();
    assert_eq!(count, 0, "Scheduler should not touch drafts or published posts");
}

#[tokio::test]
async fn scheduler_is_idempotent() {
    let (server, db) = test_app_with_db().await;
    let token = test_jwt("test-secret");

    let past_date = (chrono::Utc::now() - chrono::Duration::hours(1)).to_rfc3339();
    let body = json!({
        "slug": "idempotent-test",
        "locale": "en",
        "title": "Idempotent",
        "summary": "S",
        "content": "C",
        "tags": [],
        "image": null,
        "authors": [],
        "status": "scheduled",
        "published_at": past_date
    });
    server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status_ok();

    // First run publishes it
    let count = server::scheduler::publish_due_posts(&db).await.unwrap();
    assert_eq!(count, 1);

    // Second run does nothing (already published)
    let count = server::scheduler::publish_due_posts(&db).await.unwrap();
    assert_eq!(count, 0, "Scheduler should be idempotent");
}

// ─── Media Upload & Storage ──────────────────────────────────────────────────

/// Minimal valid 1x1 PNG (67 bytes)
fn tiny_png() -> Vec<u8> {
    vec![
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG sig
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, // width = 1
        0x00, 0x00, 0x00, 0x01, // height = 1
        0x08, 0x02, // 8-bit RGB
        0x00, 0x00, 0x00,
        0x90, 0x77, 0x53, 0xDE, // CRC
        0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
        0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, 0x00,
        0x00, 0x02, 0x00, 0x01,
        0xE2, 0x21, 0xBC, 0x33, // CRC
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
        0xAE, 0x42, 0x60, 0x82, // CRC
    ]
}

/// Helper: upload a PNG and return the response JSON
async fn upload_test_image(server: &TestServer, token: &str) -> Value {
    let png_data = tiny_png();
    let part = Part::bytes(png_data)
        .file_name("test-image.png")
        .mime_type("image/png");
    let form = MultipartForm::new().add_part("file", part);

    let res = server
        .post("/admin/upload")
        .authorization_bearer(token)
        .multipart(form)
        .await;
    res.assert_status_ok();
    res.json()
}

/// Strip the /api/v1 prefix from URLs returned by the API (test router has no prefix)
fn test_url(url: &str) -> String {
    url.strip_prefix("/api/v1").unwrap_or(url).to_string()
}

#[tokio::test]
async fn upload_image_stores_in_db() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let media: Value = upload_test_image(&server, &token).await;

    assert_eq!(media["filename"], "test-image.png");
    assert_eq!(media["mime_type"], "image/png");
    assert_eq!(media["width"], 1);
    assert_eq!(media["height"], 1);
    assert!(media["size"].as_u64().unwrap() > 0);
    assert!(
        media["url"].as_str().unwrap().contains("/api/v1/media/"),
        "URL should point to DB-served endpoint"
    );
    assert!(
        media["url"].as_str().unwrap().ends_with("/raw"),
        "URL should end with /raw"
    );
}

#[tokio::test]
async fn serve_image_from_db() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let media: Value = upload_test_image(&server, &token).await;
    let url = media["url"].as_str().unwrap();

    // Serve the image (no auth needed for serving)
    let res = server.get(&test_url(url)).await;
    res.assert_status_ok();

    let headers = res.headers();
    assert_eq!(headers.get("content-type").unwrap(), "image/png");
    assert!(
        headers
            .get("cache-control")
            .unwrap()
            .to_str()
            .unwrap()
            .contains("immutable"),
        "Should have immutable cache"
    );

    // Body should be the actual PNG bytes
    let body = res.as_bytes();
    assert!(body.starts_with(&[0x89, 0x50, 0x4E, 0x47]), "Should be valid PNG");
}

#[tokio::test]
async fn serve_nonexistent_image_returns_404() {
    let server = test_app().await;
    let res = server.get("/media/nonexistent/raw").await;
    res.assert_status(axum::http::StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn list_media_returns_uploaded_images() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    // Initially empty
    let res = server
        .get("/admin/media")
        .authorization_bearer(&token)
        .await;
    res.assert_status_ok();
    let list: Vec<Value> = res.json();
    assert!(list.is_empty());

    // Upload two images
    upload_test_image(&server, &token).await;
    upload_test_image(&server, &token).await;

    // Now should have 2
    let res = server
        .get("/admin/media")
        .authorization_bearer(&token)
        .await;
    let list: Vec<Value> = res.json();
    assert_eq!(list.len(), 2);
    assert_eq!(list[0]["filename"], "test-image.png");
}

#[tokio::test]
async fn delete_media_removes_from_db() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let media: Value = upload_test_image(&server, &token).await;
    let id = media["id"].as_str().unwrap();
    let url = media["url"].as_str().unwrap();

    // Delete
    let res = server
        .delete(&format!("/admin/media/{}", id))
        .authorization_bearer(&token)
        .await;
    res.assert_status_ok();
    let body: Value = res.json();
    assert_eq!(body["ok"], true);

    // Serving should now 404
    let res = server.get(&test_url(url)).await;
    res.assert_status(axum::http::StatusCode::NOT_FOUND);

    // List should be empty
    let res = server
        .get("/admin/media")
        .authorization_bearer(&token)
        .await;
    let list: Vec<Value> = res.json();
    assert!(list.is_empty());
}

#[tokio::test]
async fn delete_nonexistent_media_returns_404() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let res = server
        .delete("/admin/media/nonexistent")
        .authorization_bearer(&token)
        .await;
    res.assert_status(axum::http::StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn upload_rejects_non_image() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let part = Part::bytes(vec![0x00, 0x01, 0x02])
        .file_name("malware.exe")
        .mime_type("application/octet-stream");
    let form = MultipartForm::new().add_part("file", part);

    let res = server
        .post("/admin/upload")
        .authorization_bearer(token)
        .multipart(form)
        .await;
    res.assert_status(axum::http::StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn media_endpoints_require_auth() {
    let server = test_app().await;

    // List without auth
    let res = server.get("/admin/media").await;
    res.assert_status(axum::http::StatusCode::UNAUTHORIZED);

    // Upload without auth
    let part = Part::bytes(tiny_png())
        .file_name("test.png")
        .mime_type("image/png");
    let form = MultipartForm::new().add_part("file", part);
    let res = server.post("/admin/upload").multipart(form).await;
    res.assert_status(axum::http::StatusCode::UNAUTHORIZED);

    // Delete without auth
    let res = server.delete("/admin/media/someid").await;
    res.assert_status(axum::http::StatusCode::UNAUTHORIZED);
}

// ─── Tags ────────────────────────────────────────────────────────────────────

#[tokio::test]
async fn list_tags_empty() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let res = server
        .get("/admin/tags")
        .authorization_bearer(&token)
        .await;
    res.assert_status_ok();
    let tags: Vec<String> = res.json();
    assert!(tags.is_empty());
}

#[tokio::test]
async fn list_tags_aggregates_from_posts() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    // Create posts with different tags
    let post1 = json!({
        "slug": "tag-test-1", "locale": "en", "title": "P1", "summary": "S",
        "content": "C", "tags": ["rust", "devblog"], "image": null,
        "image_position": null, "authors": [], "status": "published", "published_at": null
    });
    let post2 = json!({
        "slug": "tag-test-2", "locale": "en", "title": "P2", "summary": "S",
        "content": "C", "tags": ["rust", "announcement"], "image": null,
        "image_position": null, "authors": [], "status": "draft", "published_at": null
    });

    server.post("/admin/posts").authorization_bearer(&token).json(&post1).await;
    server.post("/admin/posts").authorization_bearer(&token).json(&post2).await;

    let res = server
        .get("/admin/tags")
        .authorization_bearer(&token)
        .await;
    res.assert_status_ok();
    let tags: Vec<String> = res.json();

    // Should have 3 unique sorted tags
    assert!(tags.contains(&"rust".to_string()));
    assert!(tags.contains(&"devblog".to_string()));
    assert!(tags.contains(&"announcement".to_string()));
    assert_eq!(tags.len(), 3);
    // Should be sorted
    assert_eq!(tags, vec!["announcement", "devblog", "rust"]);
}

#[tokio::test]
async fn tags_require_auth() {
    let server = test_app().await;
    let res = server.get("/admin/tags").await;
    res.assert_status(axum::http::StatusCode::UNAUTHORIZED);
}

// ─── Image Position ──────────────────────────────────────────────────────────

#[tokio::test]
async fn image_position_persists() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let body = json!({
        "slug": "img-pos-test", "locale": "en", "title": "Position Test", "summary": "S",
        "content": "C", "tags": [], "image": "/api/v1/media/some-id/raw",
        "image_position": "30% 70%", "authors": [], "status": "published", "published_at": null
    });

    let res = server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&body)
        .await;
    res.assert_status_ok();
    let post: Value = res.json();
    assert_eq!(post["image_position"], "30% 70%");

    // Verify via public get
    let res = server
        .get("/posts/img-pos-test")
        .add_query_param("locale", "en")
        .await;
    res.assert_status_ok();
    let post: Value = res.json();
    assert_eq!(post["image_position"], "30% 70%");
}

#[tokio::test]
async fn image_position_nullable() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let body = json!({
        "slug": "no-pos-test", "locale": "en", "title": "No Position", "summary": "S",
        "content": "C", "tags": [], "image": null,
        "image_position": null, "authors": [], "status": "published", "published_at": null
    });

    let res = server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&body)
        .await;
    res.assert_status_ok();
    let post: Value = res.json();
    assert!(post["image_position"].is_null());
}

// ─── Admin List ──────────────────────────────────────────────────────────────

#[tokio::test]
async fn admin_list_returns_all_statuses() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let draft = json!({
        "slug": "list-draft", "locale": "en", "title": "Draft", "summary": "S",
        "content": "C", "tags": [], "image": null, "image_position": null,
        "authors": [], "status": "draft", "published_at": null
    });
    let published = json!({
        "slug": "list-pub", "locale": "en", "title": "Published", "summary": "S",
        "content": "C", "tags": [], "image": null, "image_position": null,
        "authors": [], "status": "published", "published_at": null
    });

    server.post("/admin/posts").authorization_bearer(&token).json(&draft).await;
    server.post("/admin/posts").authorization_bearer(&token).json(&published).await;

    let res = server
        .get("/admin/posts")
        .authorization_bearer(&token)
        .await;
    let posts: Vec<Value> = res.json();
    assert_eq!(posts.len(), 2, "Admin list should show all statuses");
}

// ─── Pagination ─────────────────────────────────────────────────────────────

#[tokio::test]
async fn list_posts_pagination() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    // Create 5 published posts
    for i in 0..5 {
        let body = json!({
            "slug": format!("page-post-{i}"),
            "locale": "en",
            "title": format!("Page Post {i}"),
            "summary": "S",
            "content": "C",
            "tags": [],
            "image": null,
            "authors": [],
            "status": "published",
            "published_at": null
        });
        server
            .post("/admin/posts")
            .authorization_bearer(&token)
            .json(&body)
            .await
            .assert_status_ok();
    }

    // Fetch page 0 with limit 2
    let res = server
        .get("/posts")
        .add_query_param("locale", "en")
        .add_query_param("limit", "2")
        .add_query_param("page", "0")
        .await;
    res.assert_status_ok();
    let body: Value = res.json();
    assert_eq!(body["total"], 5);
    assert_eq!(body["posts"].as_array().unwrap().len(), 2);

    // Fetch page 2 with limit 2 → should have 1 post
    let res = server
        .get("/posts")
        .add_query_param("locale", "en")
        .add_query_param("limit", "2")
        .add_query_param("page", "2")
        .await;
    let body: Value = res.json();
    assert_eq!(body["total"], 5);
    assert_eq!(body["posts"].as_array().unwrap().len(), 1);
}

// ─── Search ─────────────────────────────────────────────────────────────────

#[tokio::test]
async fn posts_filtered_by_search() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let post1 = json!({
        "slug": "alpha-intro",
        "locale": "en",
        "title": "Alpha Introduction",
        "summary": "About alpha things",
        "content": "C",
        "tags": ["devblog"],
        "image": null,
        "authors": [],
        "status": "published",
        "published_at": null
    });
    let post2 = json!({
        "slug": "beta-guide",
        "locale": "en",
        "title": "Beta Guide",
        "summary": "About beta things",
        "content": "C",
        "tags": ["devblog"],
        "image": null,
        "authors": [],
        "status": "published",
        "published_at": null
    });

    server.post("/admin/posts").authorization_bearer(&token).json(&post1).await;
    server.post("/admin/posts").authorization_bearer(&token).json(&post2).await;

    // Search for "alpha"
    let res = server
        .get("/posts")
        .add_query_param("locale", "en")
        .add_query_param("search", "alpha")
        .await;
    let body: Value = res.json();
    let posts = body["posts"].as_array().unwrap();
    assert_eq!(posts.len(), 1);
    assert_eq!(posts[0]["slug"], "alpha-intro");
    assert_eq!(body["total"], 1);

    // Search + tag combined
    let res = server
        .get("/posts")
        .add_query_param("locale", "en")
        .add_query_param("search", "beta")
        .add_query_param("tag", "devblog")
        .await;
    let body: Value = res.json();
    assert_eq!(body["posts"].as_array().unwrap().len(), 1);
    assert_eq!(body["posts"][0]["slug"], "beta-guide");
}

// ─── Public Tags ────────────────────────────────────────────────────────────

#[tokio::test]
async fn public_tags_endpoint() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    // Empty initially
    let res = server.get("/tags").add_query_param("locale", "en").await;
    res.assert_status_ok();
    let tags: Vec<serde_json::Value> = res.json();
    assert!(tags.is_empty());

    // Create a published post with tags
    let post = json!({
        "slug": "pub-tag-test",
        "locale": "en",
        "title": "P",
        "summary": "S",
        "content": "C",
        "tags": ["rust", "devblog"],
        "image": null,
        "authors": [],
        "status": "published",
        "published_at": null
    });
    server.post("/admin/posts").authorization_bearer(&token).json(&post).await;

    // Create a draft with a tag (should NOT appear in public tags)
    let draft = json!({
        "slug": "draft-tag-test",
        "locale": "en",
        "title": "D",
        "summary": "S",
        "content": "C",
        "tags": ["secret"],
        "image": null,
        "authors": [],
        "status": "draft",
        "published_at": null
    });
    server.post("/admin/posts").authorization_bearer(&token).json(&draft).await;

    let res = server.get("/tags").add_query_param("locale", "en").await;
    let tags: Vec<serde_json::Value> = res.json();
    let tag_names: Vec<&str> = tags.iter().map(|t| t["name"].as_str().unwrap()).collect();
    assert_eq!(tag_names, vec!["devblog", "rust"]);
    assert!(!tag_names.contains(&"secret"), "Draft tags should not appear");
    // All tags should have a default color
    assert!(tags.iter().all(|t| t["color"].as_str().is_some()));
}

// ─── Pass 1: Edge Case Tests ────────────────────────────────────────────────

#[tokio::test]
async fn create_post_rejects_invalid_slug() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let body = json!({
        "slug": "!!BAD SLUG!!",
        "locale": "en",
        "title": "Test",
        "summary": "Test",
        "content": "Content",
        "tags": [],
        "image": null,
        "authors": [],
        "status": "draft",
        "published_at": null
    });
    let res = server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&body)
        .await;
    res.assert_status(axum::http::StatusCode::BAD_REQUEST);
    let body: Value = res.json();
    assert!(body["error"].as_str().unwrap().contains("slug"));
}

#[tokio::test]
async fn create_post_rejects_invalid_locale() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let body = json!({
        "slug": "valid-slug",
        "locale": "de",
        "title": "Test",
        "summary": "Test",
        "content": "Content",
        "tags": [],
        "image": null,
        "authors": [],
        "status": "draft",
        "published_at": null
    });
    let res = server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&body)
        .await;
    res.assert_status(axum::http::StatusCode::BAD_REQUEST);
    let body: Value = res.json();
    assert!(body["error"].as_str().unwrap().contains("locale"));
}

#[tokio::test]
async fn create_post_rejects_invalid_status() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let body = json!({
        "slug": "valid-slug",
        "locale": "en",
        "title": "Test",
        "summary": "Test",
        "content": "Content",
        "tags": [],
        "image": null,
        "authors": [],
        "status": "banana",
        "published_at": null
    });
    let res = server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&body)
        .await;
    res.assert_status(axum::http::StatusCode::BAD_REQUEST);
    let body: Value = res.json();
    assert!(body["error"].as_str().unwrap().contains("status"));
}

#[tokio::test]
async fn create_post_rejects_empty_title() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let body = json!({
        "slug": "valid-slug",
        "locale": "en",
        "title": "",
        "summary": "Test",
        "content": "Content",
        "tags": [],
        "image": null,
        "authors": [],
        "status": "draft",
        "published_at": null
    });
    let res = server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&body)
        .await;
    res.assert_status(axum::http::StatusCode::BAD_REQUEST);
    let body: Value = res.json();
    assert!(body["error"].as_str().unwrap().contains("title"));
}

#[tokio::test]
async fn create_post_rejects_oversized_content() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let huge_content = "x".repeat(600 * 1024); // 600KB
    let body = json!({
        "slug": "valid-slug",
        "locale": "en",
        "title": "Test",
        "summary": "Test",
        "content": huge_content,
        "tags": [],
        "image": null,
        "authors": [],
        "status": "draft",
        "published_at": null
    });
    let res = server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&body)
        .await;
    res.assert_status(axum::http::StatusCode::BAD_REQUEST);
    let body: Value = res.json();
    assert!(body["error"].as_str().unwrap().contains("500KB"));
}

#[tokio::test]
async fn upsert_tag_color_rejects_invalid_hex() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let body = json!({ "name": "rust", "color": "not-a-color" });
    let res = server
        .put("/admin/tags/color")
        .authorization_bearer(&token)
        .json(&body)
        .await;
    res.assert_status(axum::http::StatusCode::BAD_REQUEST);
    let body: Value = res.json();
    assert!(body["error"].as_str().unwrap().contains("hex color"));
}

#[tokio::test]
async fn create_duplicate_slug_locale_returns_conflict() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let body = json!({
        "slug": "duplicate-test",
        "locale": "en",
        "title": "First",
        "summary": "First",
        "content": "Content",
        "tags": [],
        "image": null,
        "authors": [],
        "status": "draft",
        "published_at": null
    });

    // First create succeeds
    server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status_ok();

    // Second create with same slug+locale → 409
    let body2 = json!({
        "slug": "duplicate-test",
        "locale": "en",
        "title": "Second",
        "summary": "Second",
        "content": "Content",
        "tags": [],
        "image": null,
        "authors": [],
        "status": "draft",
        "published_at": null
    });
    let res = server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&body2)
        .await;
    res.assert_status(axum::http::StatusCode::CONFLICT);
    let body: Value = res.json();
    assert!(body["error"].as_str().unwrap().contains("already exists"));
}

#[tokio::test]
async fn create_post_rejects_slug_with_leading_hyphen() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let body = json!({
        "slug": "-leading-hyphen",
        "locale": "en",
        "title": "Test",
        "summary": "Test",
        "content": "Content",
        "tags": [],
        "image": null,
        "authors": [],
        "status": "draft",
        "published_at": null
    });
    let res = server
        .post("/admin/posts")
        .authorization_bearer(&token)
        .json(&body)
        .await;
    res.assert_status(axum::http::StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn upsert_tag_color_rejects_empty_name() {
    let server = test_app().await;
    let token = test_jwt("test-secret");

    let body = json!({ "name": "", "color": "#FF0000" });
    let res = server
        .put("/admin/tags/color")
        .authorization_bearer(&token)
        .json(&body)
        .await;
    res.assert_status(axum::http::StatusCode::BAD_REQUEST);
}
