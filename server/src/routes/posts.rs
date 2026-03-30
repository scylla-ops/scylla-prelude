use axum::Json;
use axum::extract::{Path, Query, State};
use serde::Deserialize;

use crate::AppState;
use crate::error::AppError;
use crate::models::post::{self, PaginatedPosts, Post, PostSummary};
use crate::models::tag_meta::{self, TagMeta};

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

pub async fn list_posts(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Result<Json<PaginatedPosts>, AppError> {
    let locale = params.locale.unwrap_or_else(|| "en".into());
    let limit = params.limit.unwrap_or(20);
    let offset = params.page.unwrap_or(0) * limit;

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

    let mut where_clause =
        "WHERE status = 'published' AND locale = $locale".to_string();
    let has_tags = !tag_list.is_empty();
    let has_search = params.search.is_some();

    if has_tags {
        // Each tag must be present (AND logic)
        for (i, _) in tag_list.iter().enumerate() {
            where_clause.push_str(&format!(" AND tags CONTAINS $tag_{i}"));
        }
    }
    if has_search {
        where_clause.push_str(
            " AND (string::lowercase(title) CONTAINS string::lowercase($search) \
             OR string::lowercase(summary) CONTAINS string::lowercase($search))",
        );
    }

    let select_query = format!(
        "SELECT slug, locale, title, summary, tags, image, image_position, \
         authors, reading_time, status, published_at, created_at \
         FROM type::table($table) {where_clause} \
         ORDER BY created_at DESC LIMIT $limit START $offset"
    );
    let count_query = format!(
        "SELECT count() AS total FROM type::table($table) {where_clause} GROUP ALL"
    );

    let combined = format!("{select_query};\n{count_query}");

    let mut query = state.db.query(&combined)
        .bind(("table", post::TABLE))
        .bind(("locale", locale))
        .bind(("limit", limit))
        .bind(("offset", offset));

    for (i, tag) in tag_list.into_iter().enumerate() {
        query = query.bind((format!("tag_{i}"), tag));
    }
    if let Some(search) = params.search {
        query = query.bind(("search", search));
    }

    let mut result = query.await?;

    let posts: Vec<PostSummary> = result.take(0)?;

    // COUNT with GROUP ALL returns None when no rows match
    let count_row: Option<serde_json::Value> = result.take(1)?;
    let total = count_row
        .and_then(|v| v.get("total").and_then(|t| t.as_u64()))
        .unwrap_or(0);

    Ok(Json(PaginatedPosts { posts, total }))
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

/// Returns tags with their colors. Tags used in published posts for the given
/// locale are returned; each tag is enriched with its color from tag_meta.
pub async fn list_tags(
    State(state): State<AppState>,
    Query(params): Query<TagsParams>,
) -> Result<Json<Vec<TagMeta>>, AppError> {
    let locale = params.locale.unwrap_or_else(|| "en".into());

    // Get distinct tag names from published posts
    let mut result = state
        .db
        .query(
            "SELECT tags FROM type::table($table) \
             WHERE status = 'published' AND locale = $locale GROUP ALL",
        )
        .bind(("table", post::TABLE))
        .bind(("locale", locale))
        .await?;

    let tags_raw: Option<serde_json::Value> = result.take(0)?;

    let mut tag_names: Vec<String> = Vec::new();
    if let Some(serde_json::Value::Object(map)) = tags_raw {
        if let Some(serde_json::Value::Array(arr)) = map.get("tags") {
            for item in arr {
                if let serde_json::Value::String(t) = item {
                    if !tag_names.contains(t) {
                        tag_names.push(t.clone());
                    }
                } else if let serde_json::Value::Array(inner) = item {
                    for t in inner {
                        if let serde_json::Value::String(s) = t {
                            if !tag_names.contains(s) {
                                tag_names.push(s.clone());
                            }
                        }
                    }
                }
            }
        }
    }

    tag_names.sort();

    // Fetch all tag_meta records
    let mut meta_result = state
        .db
        .query("SELECT name, color FROM type::table($table)")
        .bind(("table", tag_meta::TABLE))
        .await?;
    let metas: Vec<TagMeta> = meta_result.take(0)?;

    // Merge: use color from tag_meta if it exists, otherwise default
    let tags: Vec<TagMeta> = tag_names
        .into_iter()
        .map(|name| {
            let color = metas
                .iter()
                .find(|m| m.name == name)
                .map(|m| m.color.clone())
                .unwrap_or_else(|| "#6b7280".to_string());
            TagMeta { name, color }
        })
        .collect();

    Ok(Json(tags))
}
