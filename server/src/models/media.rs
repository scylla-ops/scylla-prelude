use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use surrealdb_types::{Bytes, RecordId, SurrealValue};

pub const TABLE: &str = "media";

/// Full media record including binary data (for serving)
#[derive(Debug, Clone, Serialize, Deserialize, SurrealValue)]
pub struct Media {
    pub id: Option<RecordId>,
    pub filename: String,
    pub mime_type: String,
    pub size: u64,
    pub width: u32,
    pub height: u32,
    pub data: Bytes,
    pub created_at: DateTime<Utc>,
}

/// Summary without binary data (for listing)
#[derive(Debug, Serialize, Deserialize, SurrealValue)]
pub struct MediaSummary {
    pub id: Option<RecordId>,
    pub filename: String,
    pub mime_type: String,
    pub size: u64,
    pub width: u32,
    pub height: u32,
    pub created_at: DateTime<Utc>,
}

/// Data for creating a new media record
#[derive(Debug, Serialize, SurrealValue)]
pub struct CreateMedia {
    pub filename: String,
    pub mime_type: String,
    pub size: u64,
    pub width: u32,
    pub height: u32,
    pub data: Bytes,
}
