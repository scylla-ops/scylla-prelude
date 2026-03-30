use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use surrealdb_types::{RecordId, SurrealValue};

pub const TABLE: &str = "post";

/// Average reading speed in words per minute
const WORDS_PER_MINUTE: usize = 200;

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
    pub authors: Vec<String>,
    pub reading_time: u32,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
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
    pub authors: Vec<String>,
    pub reading_time: u32,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}
