use axum::Json;
use axum::extract::{Path, Query, State};
use serde::Deserialize;

use crate::AppState;
use crate::error::AppError;
use crate::models::post::{PaginatedPosts, Post};
use crate::models::tag_meta::{self, TagMeta};
use crate::repo;

#[derive(Deserialize)]
pub struct ListParams {
    pub locale: Option<String>,
    pub tag: Option<String>,
    pub tags: Option<String>,
    pub search: Option<String>,
    pub page: Option<u32>,
    pub limit: Option<u32>,
}

#[derive(Deserialize)]
pub struct SingleParams {
    pub locale: Option<String>,
}

#[derive(Deserialize)]
pub struct TagsParams {
    pub locale: Option<String>,
}

/// Default to "en" if the locale is missing or not in the allowlist.
fn sanitize_locale(raw: Option<String>) -> String {
    match raw.as_deref() {
        Some("en") => "en".into(),
        Some("fr") => "fr".into(),
        _ => "en".into(),
    }
}

pub async fn list_posts(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Result<Json<PaginatedPosts>, AppError> {
    let locale = sanitize_locale(params.locale);
    let limit = params.limit.unwrap_or(20).clamp(1, 100);
    let page = params.page.unwrap_or(0).min(10000);
    let offset = page * limit;

    // Validate search length
    if let Some(ref s) = params.search
        && s.len() > 200
    {
        return Err(AppError::BadRequest("search query too long (max 200 chars)".into()));
    }

    // Collect tags from both ?tag= and ?tags= params
    let mut tag_list: Vec<String> = Vec::new();
    if let Some(t) = &params.tag {
        tag_list.push(t.clone());
    }
    if let Some(ts) = &params.tags {
        for t in ts.split(',') {
            let t = t.trim().to_string();
            if !t.is_empty() && !tag_list.contains(&t) {
                tag_list.push(t);
            }
        }
    }

    let search = params.search.and_then(|s| {
        let trimmed = s.trim().to_string();
        if trimmed.is_empty() { None } else { Some(trimmed) }
    });

    let (posts, total) =
        repo::post::list_published(&state.db, &locale, tag_list, search, limit, offset).await?;

    Ok(Json(PaginatedPosts { posts, total }))
}

pub async fn get_post(
    State(state): State<AppState>,
    Path(slug): Path<String>,
    Query(params): Query<SingleParams>,
) -> Result<Json<Post>, AppError> {
    let locale = sanitize_locale(params.locale);
    let post = repo::post::get_published(&state.db, &slug, &locale).await?;
    post.map(Json).ok_or(AppError::NotFound)
}

/// Returns tags with their colors. Tags used in published posts for the given
/// locale are returned; each tag is enriched with its color from tag_meta.
pub async fn list_tags(
    State(state): State<AppState>,
    Query(params): Query<TagsParams>,
) -> Result<Json<Vec<TagMeta>>, AppError> {
    let locale = sanitize_locale(params.locale);

    let tags_raw = repo::post::published_tag_names(&state.db, &locale).await?;
    let tag_names = tag_meta::dedup_tag_names(tags_raw);

    let metas = repo::tag::list_all_meta(&state.db).await?;
    let tags = tag_meta::merge_tags_with_colors(tag_names, metas);

    Ok(Json(tags))
}
