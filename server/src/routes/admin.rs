use axum::Json;
use axum::extract::{Path, Query, State};
use chrono::{DateTime, Utc};
use serde::Deserialize;

use crate::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::post::{CreatePost, PatchStatus, Post, PostSummary, UpdatePost, estimate_reading_time};
use crate::repo;
use crate::validation::validate_post_fields;

#[derive(Deserialize)]
pub struct LocaleParam {
    pub locale: Option<String>,
}

#[derive(Deserialize)]
pub struct AdminListParams {
    pub page: Option<u32>,
    pub limit: Option<u32>,
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
    Query(params): Query<AdminListParams>,
) -> Result<Json<Vec<PostSummary>>, AppError> {
    let (limit, offset) = if params.limit.is_some() || params.page.is_some() {
        let l = params.limit.unwrap_or(20).clamp(1, 100);
        let o = params.page.unwrap_or(0).min(10000) * l;
        (Some(l), Some(o))
    } else {
        (None, None)
    };

    let posts = repo::post::list_all(&state.db, limit, offset).await?;
    Ok(Json(posts))
}

pub async fn get_post(
    State(state): State<AppState>,
    _auth: AuthUser,
    Path(slug): Path<String>,
    Query(params): Query<LocaleParam>,
) -> Result<Json<Post>, AppError> {
    let locale = params.locale.unwrap_or_else(|| "en".into());
    let post = repo::post::get_by_slug(&state.db, &slug, &locale).await?;
    post.map(Json).ok_or(AppError::NotFound)
}

pub async fn create_post(
    State(state): State<AppState>,
    _auth: AuthUser,
    Json(req): Json<CreatePostRequest>,
) -> Result<Json<Option<Post>>, AppError> {
    validate_post_fields(&req)?;

    let reading_time = estimate_reading_time(&req.content);

    let published_at = if req.status == "published" && req.published_at.is_none() {
        Some(Utc::now())
    } else {
        req.published_at
    };

    let post = repo::post::create(
        &state.db,
        CreatePost {
            slug: req.slug,
            locale: req.locale,
            title: req.title,
            summary: req.summary,
            content: req.content,
            tags: req.tags,
            image: req.image,
            image_position: req.image_position,
            authors: req.authors,
            reading_time,
            status: req.status,
            published_at,
        },
    )
    .await
    .map_err(|e| {
        let msg = e.to_string();
        if msg.contains("already exists") || msg.contains("unique") {
            AppError::Conflict("post with this slug+locale already exists".to_string())
        } else {
            AppError::from(e)
        }
    })?;

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

    let post = repo::post::update(
        &state.db,
        &slug,
        UpdatePost {
            locale: req.locale,
            title: req.title,
            summary: req.summary,
            content: req.content,
            tags: req.tags,
            image: req.image,
            image_position: req.image_position,
            authors: req.authors,
            reading_time,
            status: req.status,
            published_at: req.published_at,
            updated_at: Utc::now(),
        },
    )
    .await?;

    post.map(Json).ok_or(AppError::NotFound)
}

#[derive(Deserialize)]
pub struct PatchStatusRequest {
    pub locale: String,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
}

pub async fn patch_post_status(
    State(state): State<AppState>,
    _auth: AuthUser,
    Path(slug): Path<String>,
    Json(req): Json<PatchStatusRequest>,
) -> Result<Json<Post>, AppError> {
    crate::validation::validate_locale(&req.locale)?;
    crate::validation::validate_status(&req.status)?;

    let post = repo::post::patch_status(
        &state.db,
        &slug,
        &req.locale,
        PatchStatus {
            status: req.status,
            published_at: req.published_at,
            updated_at: Utc::now(),
        },
    )
    .await?;

    post.map(Json).ok_or(AppError::NotFound)
}

pub async fn delete_post(
    State(state): State<AppState>,
    _auth: AuthUser,
    Path(slug): Path<String>,
    Query(params): Query<LocaleParam>,
) -> Result<Json<Option<Post>>, AppError> {
    let locale = params.locale.unwrap_or_else(|| "en".into());
    let post = repo::post::delete(&state.db, &slug, &locale).await?;
    Ok(Json(post))
}
