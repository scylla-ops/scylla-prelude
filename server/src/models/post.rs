use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use surrealdb_types::{RecordId, SurrealValue};

pub const TABLE: &str = "post";

/// Average reading speed in words per minute
const WORDS_PER_MINUTE: usize = 200;

/// Build the record key for a post: `{slug}_{locale}`
pub fn post_key(slug: &str, locale: &str) -> String {
    format!("{slug}_{locale}")
}

/// Estimate reading time in minutes from markdown content
pub fn estimate_reading_time(content: &str) -> u32 {
    let word_count = content.split_whitespace().count();
    let minutes = (word_count as f64 / WORDS_PER_MINUTE as f64).ceil() as u32;
    minutes.max(1)
}

#[derive(Debug, Clone, Serialize, Deserialize, SurrealValue)]
pub struct Post {
    pub id: Option<RecordId>,
    pub slug: String,
    pub locale: String,
    pub title: String,
    pub summary: String,
    pub content: String,
    pub tags: Vec<String>,
    pub image: Option<String>,
    pub image_position: Option<String>,
    pub authors: Vec<String>,
    pub reading_time: u32,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Data for creating a new post (no id/timestamps — SurrealDB sets those)
#[derive(Debug, Serialize, SurrealValue)]
pub struct CreatePost {
    pub slug: String,
    pub locale: String,
    pub title: String,
    pub summary: String,
    pub content: String,
    pub tags: Vec<String>,
    pub image: Option<String>,
    pub image_position: Option<String>,
    pub authors: Vec<String>,
    pub reading_time: u32,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
}

/// Data for fully updating an existing post (slug excluded — derived from path param)
#[derive(Debug, Serialize, SurrealValue)]
pub struct UpdatePost {
    pub locale: String,
    pub title: String,
    pub summary: String,
    pub content: String,
    pub tags: Vec<String>,
    pub image: Option<String>,
    pub image_position: Option<String>,
    pub authors: Vec<String>,
    pub reading_time: u32,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
    pub updated_at: DateTime<Utc>,
}

/// Partial update for status changes only
#[derive(Debug, Serialize, SurrealValue)]
pub struct PatchStatus {
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, SurrealValue)]
pub struct PostSummary {
    pub slug: String,
    pub locale: String,
    pub title: String,
    pub summary: String,
    pub tags: Vec<String>,
    pub image: Option<String>,
    pub image_position: Option<String>,
    pub authors: Vec<String>,
    pub reading_time: u32,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedPosts {
    pub posts: Vec<PostSummary>,
    pub total: u64,
}
