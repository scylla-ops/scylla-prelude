use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use surrealdb_types::{RecordId, SurrealValue};

pub const TABLE: &str = "post";

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
    pub status: String,
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
    pub status: String,
    pub created_at: DateTime<Utc>,
}
