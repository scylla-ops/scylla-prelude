use surrealdb::Surreal;
use surrealdb::engine::any::Any;

use crate::models::media::{self, CreateMedia, Media, MediaSummary};

type Db = Surreal<Any>;

/// List all media metadata (excludes binary data), ordered by created_at DESC.
pub async fn list_all(db: &Db) -> surrealdb::Result<Vec<MediaSummary>> {
    let mut result = db
        .query(
            "SELECT id, filename, mime_type, size, width, height, created_at
             FROM type::table($table)
             ORDER BY created_at DESC",
        )
        .bind(("table", media::TABLE))
        .await?;
    result.take(0)
}

/// Get a single media record by ID (includes binary data).
pub async fn get_by_id(db: &Db, id: &str) -> surrealdb::Result<Option<Media>> {
    db.select((media::TABLE, id)).await
}

/// Create a new media record. Returns the created record summary.
pub async fn create(db: &Db, data: CreateMedia) -> surrealdb::Result<Option<MediaSummary>> {
    db.create(media::TABLE).content(data).await
}

/// Delete a media record by ID. Returns the deleted record.
pub async fn delete(db: &Db, id: &str) -> surrealdb::Result<Option<Media>> {
    db.delete((media::TABLE, id)).await
}
