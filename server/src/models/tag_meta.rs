use serde::{Deserialize, Serialize};
use surrealdb_types::SurrealValue;

pub const TABLE: &str = "tag_meta";

#[derive(Debug, Clone, Serialize, Deserialize, SurrealValue)]
pub struct TagMeta {
    pub name: String,
    pub color: String,
}
