use surrealdb::Surreal;
use surrealdb::engine::any::Any;

use crate::models::tag_meta::{self, TagMeta};

type Db = Surreal<Any>;

/// Get all tag_meta records.
pub async fn list_all_meta(db: &Db) -> surrealdb::Result<Vec<TagMeta>> {
    let mut result = db
        .query("SELECT name, color FROM type::table($table)")
        .bind(("table", tag_meta::TABLE))
        .await?;
    result.take(0)
}

/// Upsert a tag color. Creates if not exists, updates if it does.
pub async fn upsert_color(db: &Db, name: &str, color: &str) -> surrealdb::Result<Option<TagMeta>> {
    db.upsert((tag_meta::TABLE, name))
        .content(TagMeta {
            name: name.to_string(),
            color: color.to_string(),
        })
        .await
}
