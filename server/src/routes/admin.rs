use axum::Json;
use axum::extract::{Path, Query, State};
use chrono::{DateTime, Utc};
use serde::Deserialize;

use crate::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::post::{self, Post, PostSummary, estimate_reading_time};

#[derive(Deserialize)]
pub struct LocaleParam {
    pub locale: Option<String>,
}

#[derive(Deserialize)]
pub struct CreatePostRequest {
    pub slug: String,
    pub locale: String,
    pub title: String,
    pub summary: String,
    pub content: String,
    pub tags: Vec<String>,
    pub image: Option<String>,
    pub authors: Vec<String>,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
}

pub async fn list_all_posts(
    State(state): State<AppState>,
    _auth: AuthUser,
) -> Result<Json<Vec<PostSummary>>, AppError> {
    let mut result = state
        .db
        .query(
            "SELECT slug, locale, title, summary, tags, image, authors, reading_time, status, published_at, created_at
             FROM type::table($table)
             ORDER BY created_at DESC",
        )
        .bind(("table", post::TABLE))
        .await?;
    let posts: Vec<PostSummary> = result.take(0)?;
    Ok(Json(posts))
}

pub async fn get_post(
    State(state): State<AppState>,
    _auth: AuthUser,
    Path(slug): Path<String>,
    Query(params): Query<LocaleParam>,
) -> Result<Json<Post>, AppError> {
    let locale = params.locale.unwrap_or_else(|| "en".into());
    let mut result = state
        .db
        .query(
            "SELECT * FROM type::table($table)
             WHERE slug = $slug AND locale = $locale
             LIMIT 1",
        )
        .bind(("table", post::TABLE))
        .bind(("slug", slug))
        .bind(("locale", locale))
        .await?;
    let post: Option<Post> = result.take(0)?;
    post.map(Json).ok_or(AppError::NotFound)
}

pub async fn create_post(
    State(state): State<AppState>,
    _auth: AuthUser,
    Json(req): Json<CreatePostRequest>,
) -> Result<Json<Option<Post>>, AppError> {
    let reading_time = estimate_reading_time(&req.content);

    let mut result = state
        .db
        .query(
            "CREATE type::table($table) CONTENT {
                slug: $slug,
                locale: $locale,
                title: $title,
                summary: $summary,
                content: $content,
                tags: $tags,
                image: $image,
                authors: $authors,
                reading_time: $reading_time,
                status: $status,
                published_at: $published_at
            }",
        )
        .bind(("table", post::TABLE))
        .bind(("slug", req.slug))
        .bind(("locale", req.locale))
        .bind(("title", req.title))
        .bind(("summary", req.summary))
        .bind(("content", req.content))
        .bind(("tags", req.tags))
        .bind(("image", req.image))
        .bind(("authors", req.authors))
        .bind(("reading_time", reading_time))
        .bind(("status", req.status))
        .bind(("published_at", req.published_at))
        .await?;
    let post: Option<Post> = result.take(0)?;
    Ok(Json(post))
}

pub async fn update_post(
    State(state): State<AppState>,
    _auth: AuthUser,
    Path(slug): Path<String>,
    Json(req): Json<CreatePostRequest>,
) -> Result<Json<Post>, AppError> {
    let reading_time = estimate_reading_time(&req.content);

    let mut result = state
        .db
        .query(
            "UPDATE type::table($table) SET
                title = $title,
                summary = $summary,
                content = $content,
                tags = $tags,
                image = $image,
                authors = $authors,
                reading_time = $reading_time,
                status = $status,
                published_at = $published_at,
                updated_at = time::now()
             WHERE slug = $slug AND locale = $locale
             RETURN AFTER",
        )
        .bind(("table", post::TABLE))
        .bind(("slug", slug))
        .bind(("locale", req.locale))
        .bind(("title", req.title))
        .bind(("summary", req.summary))
        .bind(("content", req.content))
        .bind(("tags", req.tags))
        .bind(("image", req.image))
        .bind(("authors", req.authors))
        .bind(("reading_time", reading_time))
        .bind(("status", req.status))
        .bind(("published_at", req.published_at))
        .await?;
    let post: Option<Post> = result.take(0)?;
    post.map(Json).ok_or(AppError::NotFound)
}

pub async fn delete_post(
    State(state): State<AppState>,
    _auth: AuthUser,
    Path(slug): Path<String>,
    Query(params): Query<LocaleParam>,
) -> Result<Json<Option<Post>>, AppError> {
    let locale = params.locale.unwrap_or_else(|| "en".into());
    let mut result = state
        .db
        .query(
            "DELETE FROM type::table($table)
             WHERE slug = $slug AND locale = $locale
             RETURN BEFORE",
        )
        .bind(("table", post::TABLE))
        .bind(("slug", slug))
        .bind(("locale", locale))
        .await?;
    let post: Option<Post> = result.take(0)?;
    Ok(Json(post))
}

pub async fn upload_image(
    State(state): State<AppState>,
    _auth: AuthUser,
    mut multipart: axum::extract::Multipart,
) -> Result<Json<serde_json::Value>, AppError> {
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(e.to_string()))?
    {
        let filename = field
            .file_name()
            .map(|s| s.to_string())
            .unwrap_or_else(|| "upload".to_string());

        let ext = filename
            .rsplit('.')
            .next()
            .unwrap_or("bin")
            .to_lowercase();

        if !matches!(ext.as_str(), "png" | "jpg" | "jpeg" | "webp" | "gif") {
            return Err(AppError::BadRequest(
                "Only png, jpg, jpeg, webp, gif allowed".into(),
            ));
        }

        let data = field
            .bytes()
            .await
            .map_err(|e| AppError::BadRequest(e.to_string()))?;

        if data.len() > 5 * 1024 * 1024 {
            return Err(AppError::BadRequest("File too large (max 5MB)".into()));
        }

        let uuid = uuid::Uuid::new_v4();
        let new_filename = format!("{}.{}", uuid, ext);
        let upload_dir = &state.config.uploads_path;

        tokio::fs::create_dir_all(upload_dir)
            .await
            .map_err(|_| AppError::BadRequest("Cannot create upload directory".into()))?;

        let file_path = format!("{}/{}", upload_dir, new_filename);
        tokio::fs::write(&file_path, &data)
            .await
            .map_err(|_| AppError::BadRequest("Failed to write file".into()))?;

        let url = format!("/images/uploads/{}", new_filename);
        return Ok(Json(serde_json::json!({ "url": url })));
    }

    Err(AppError::BadRequest("No file provided".into()))
}
