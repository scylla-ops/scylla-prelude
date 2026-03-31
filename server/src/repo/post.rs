use surrealdb::Surreal;
use surrealdb::engine::any::Any;
use surrealdb_types::SurrealValue;

use crate::models::post::{self, CreatePost, PatchStatus, Post, PostSummary, UpdatePost, post_key};

type Db = Surreal<Any>;

/// Select a single post by slug+locale (O(1) record ID lookup).
pub async fn get_by_slug(db: &Db, slug: &str, locale: &str) -> surrealdb::Result<Option<Post>> {
    let key = post_key(slug, locale);
    db.select((post::TABLE, &*key)).await
}

/// Select a published post by slug+locale.
pub async fn get_published(db: &Db, slug: &str, locale: &str) -> surrealdb::Result<Option<Post>> {
    let post: Option<Post> = get_by_slug(db, slug, locale).await?;
    Ok(post.filter(|p| p.status == "published"))
}

/// Create a new post with a deterministic record ID.
pub async fn create(db: &Db, data: CreatePost) -> surrealdb::Result<Option<Post>> {
    let key = post_key(&data.slug, &data.locale);
    db.create((post::TABLE, &*key)).content(data).await
}

/// Full update of a post via merge.
pub async fn update(db: &Db, slug: &str, data: UpdatePost) -> surrealdb::Result<Option<Post>> {
    let key = post_key(slug, &data.locale);
    db.update((post::TABLE, &*key)).merge(data).await
}

/// Partial status update via merge.
pub async fn patch_status(
    db: &Db,
    slug: &str,
    locale: &str,
    data: PatchStatus,
) -> surrealdb::Result<Option<Post>> {
    let key = post_key(slug, locale);
    db.update((post::TABLE, &*key)).merge(data).await
}

/// Delete a post by slug+locale.
pub async fn delete(db: &Db, slug: &str, locale: &str) -> surrealdb::Result<Option<Post>> {
    let key = post_key(slug, locale);
    db.delete((post::TABLE, &*key)).await
}

/// List all posts (admin), ordered by created_at DESC with optional pagination.
pub async fn list_all(
    db: &Db,
    limit: Option<u32>,
    offset: Option<u32>,
) -> surrealdb::Result<Vec<PostSummary>> {
    let query_str = match (limit, offset) {
        (Some(_), Some(_)) => {
            "SELECT slug, locale, title, summary, tags, image, image_position, \
             authors, reading_time, status, published_at, created_at \
             FROM type::table($table) ORDER BY created_at DESC \
             LIMIT $limit START $offset"
        }
        _ => {
            "SELECT slug, locale, title, summary, tags, image, image_position, \
             authors, reading_time, status, published_at, created_at \
             FROM type::table($table) ORDER BY created_at DESC"
        }
    };

    let mut result = db
        .query(query_str)
        .bind(("table", post::TABLE))
        .bind(("limit", limit.unwrap_or(1000)))
        .bind(("offset", offset.unwrap_or(0)))
        .await?;
    result.take(0)
}

/// List published posts with filters, search, tags, and pagination.
/// Returns (posts, total_count).
pub async fn list_published(
    db: &Db,
    locale: &str,
    tag_list: Vec<String>,
    search: Option<String>,
    limit: u32,
    offset: u32,
) -> surrealdb::Result<(Vec<PostSummary>, u64)> {
    let mut where_clause = "WHERE status = 'published' AND locale = $locale".to_string();

    if !tag_list.is_empty() {
        for (i, _) in tag_list.iter().enumerate() {
            where_clause.push_str(&format!(" AND tags CONTAINS $tag_{i}"));
        }
    }
    if search.is_some() {
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

    let mut query = db
        .query(&combined)
        .bind(("table", post::TABLE))
        .bind(("locale", locale.to_string()))
        .bind(("limit", limit))
        .bind(("offset", offset));

    for (i, tag) in tag_list.into_iter().enumerate() {
        query = query.bind((format!("tag_{i}"), tag));
    }
    if let Some(search) = search {
        query = query.bind(("search", search));
    }

    let mut result = query.await?;

    let posts: Vec<PostSummary> = result.take(0)?;

    #[derive(surrealdb_types::SurrealValue, serde::Deserialize)]
    struct CountResult {
        total: u64,
    }
    let count_row: Option<CountResult> = result.take(1)?;
    let total = count_row.map(|r| r.total).unwrap_or(0);

    Ok((posts, total))
}

/// Get published posts for RSS feed.
pub async fn list_for_rss(db: &Db, locale: &str, limit: u32) -> surrealdb::Result<Vec<Post>> {
    let mut result = db
        .query(
            "SELECT * FROM type::table($table)
             WHERE status = 'published' AND locale = $locale
             ORDER BY created_at DESC LIMIT $limit",
        )
        .bind(("table", post::TABLE))
        .bind(("locale", locale.to_string()))
        .bind(("limit", limit))
        .await?;
    result.take(0)
}

/// Get distinct tag names from published posts for a locale.
pub async fn published_tag_names(
    db: &Db,
    locale: &str,
) -> surrealdb::Result<Option<serde_json::Value>> {
    let mut result = db
        .query(
            "SELECT tags FROM type::table($table) \
             WHERE status = 'published' AND locale = $locale GROUP ALL",
        )
        .bind(("table", post::TABLE))
        .bind(("locale", locale.to_string()))
        .await?;
    result.take(0)
}

/// Get all distinct tags across all posts (admin).
pub async fn all_tag_names(db: &Db) -> surrealdb::Result<Option<serde_json::Value>> {
    let mut result = db
        .query("SELECT tags FROM type::table($table) GROUP ALL")
        .bind(("table", post::TABLE))
        .await?;
    result.take(0)
}
