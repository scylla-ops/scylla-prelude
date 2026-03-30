use axum_test::TestServer;
use jsonwebtoken::{EncodingKey, Header, encode};
use serde_json::{json, Value};
use server::AppState;
use server::config::AppConfig;

/// Create a test app with in-memory SurrealDB
async fn test_app() -> TestServer {
    let db = surrealdb::engine::any::connect("mem://").await.unwrap();
    db.use_ns("test").use_db("test").await.unwrap();

    // Apply schema
    db.query(include_str!("../src/db/schema.surql"))
        .await
        .unwrap();

    let config = AppConfig {
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
    };

    let state = AppState {
        db,
        config: config.clone(),
    };

    let api = server::api_router(state);
    TestServer::new(api).unwrap()
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
    let body: Vec<Value> = res.json();
    assert!(body.is_empty());
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
    let posts: Vec<Value> = res.json();
    assert!(posts.is_empty(), "Draft should not be visible publicly");

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
    let posts: Vec<Value> = res.json();
    assert_eq!(posts.len(), 1);
    assert_eq!(posts[0]["slug"], "published-post");
    assert_eq!(posts[0]["reading_time"], 1);

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
    let posts: Vec<Value> = res.json();
    assert_eq!(posts.len(), 1);
    assert_eq!(posts[0]["title"], "English Post");

    // List FR → only FR
    let res = server.get("/posts").add_query_param("locale", "fr").await;
    let posts: Vec<Value> = res.json();
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
    let posts: Vec<Value> = res.json();
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
    let posts: Vec<Value> = res.json();
    assert!(posts.is_empty(), "Scheduled post should not be visible publicly");

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
