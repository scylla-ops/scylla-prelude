use axum::Json;
use axum::extract::{Path, Query, State};
use serde::Deserialize;

use crate::AppState;
use crate::error::AppError;
use crate::models::post::{self, Post, PostSummary};

#[derive(Deserialize)]
pub struct ListParams {
    pub locale: Option<String>,
    pub tag: Option<String>,
    pub page: Option<u32>,
    pub limit: Option<u32>,
}

#[derive(Deserialize)]
pub struct SingleParams {
    pub locale: Option<String>,
}

pub async fn list_posts(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Result<Json<Vec<PostSummary>>, AppError> {
    let locale = params.locale.unwrap_or_else(|| "en".into());
    let limit = params.limit.unwrap_or(20);
    let offset = params.page.unwrap_or(0) * limit;

    let query = if let Some(tag) = params.tag {
        let mut result = state
            .db
            .query(
                "SELECT slug, locale, title, summary, tags, image, authors, status, created_at
                 FROM type::table($table)
                 WHERE status = 'published' AND locale = $locale AND tags CONTAINS $tag
                 ORDER BY created_at DESC LIMIT $limit START $offset",
            )
            .bind(("table", post::TABLE))
            .bind(("locale", locale))
            .bind(("tag", tag))
            .bind(("limit", limit))
            .bind(("offset", offset))
            .await?;
        result.take::<Vec<PostSummary>>(0)?
    } else {
        let mut result = state
            .db
            .query(
                "SELECT slug, locale, title, summary, tags, image, authors, status, created_at
                 FROM type::table($table)
                 WHERE status = 'published' AND locale = $locale
                 ORDER BY created_at DESC LIMIT $limit START $offset",
            )
            .bind(("table", post::TABLE))
            .bind(("locale", locale))
            .bind(("limit", limit))
            .bind(("offset", offset))
            .await?;
        result.take::<Vec<PostSummary>>(0)?
    };

    Ok(Json(query))
}

pub async fn get_post(
    State(state): State<AppState>,
    Path(slug): Path<String>,
    Query(params): Query<SingleParams>,
) -> Result<Json<Post>, AppError> {
    let locale = params.locale.unwrap_or_else(|| "en".into());

    let mut result = state
        .db
        .query(
            "SELECT * FROM type::table($table)
             WHERE slug = $slug AND locale = $locale AND status = 'published'
             LIMIT 1",
        )
        .bind(("table", post::TABLE))
        .bind(("slug", slug))
        .bind(("locale", locale))
        .await?;

    let post: Option<Post> = result.take(0)?;
    post.map(Json).ok_or(AppError::NotFound)
}
