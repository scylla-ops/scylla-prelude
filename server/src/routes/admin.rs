use axum::Json;
use axum::extract::{Path, Query, State};
use chrono::{DateTime, Utc};
use serde::Deserialize;

use crate::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::post::{self, Post, PostSummary, estimate_reading_time};
use crate::validation::validate_post_fields;

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
    pub image_position: Option<String>,
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
            "SELECT slug, locale, title, summary, tags, image, image_position, authors, reading_time, status, published_at, created_at
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
    validate_post_fields(&req)?;

    // Check for duplicate slug+locale
    let mut check = state
        .db
        .query(
            "SELECT count() AS total FROM type::table($table) \
             WHERE slug = $slug AND locale = $locale GROUP ALL",
        )
        .bind(("table", post::TABLE))
        .bind(("slug", req.slug.clone()))
        .bind(("locale", req.locale.clone()))
        .await?;
    let existing: Option<serde_json::Value> = check.take(0)?;
    let count = existing
        .and_then(|v| v.get("total").and_then(|t| t.as_u64()))
        .unwrap_or(0);
    if count > 0 {
        return Err(AppError::Conflict(format!(
            "post with slug '{}' and locale '{}' already exists",
            req.slug, req.locale
        )));
    }

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
                image_position: $image_position,
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
        .bind(("image_position", req.image_position))
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
    validate_post_fields(&req)?;
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
                image_position = $image_position,
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
        .bind(("image_position", req.image_position))
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
