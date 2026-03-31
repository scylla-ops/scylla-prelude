use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use surrealdb_types::SurrealValue;

pub const TABLE: &str = "tag_meta";

const DEFAULT_COLOR: &str = "#6b7280";

#[derive(Debug, Clone, Serialize, Deserialize, SurrealValue)]
pub struct TagMeta {
    pub name: String,
    pub color: String,
}

/// Deduplicate tag names from the raw GROUP ALL result (which may contain
/// nested arrays) and return them sorted.
pub fn dedup_tag_names(tags_raw: Option<serde_json::Value>) -> Vec<String> {
    let mut names: Vec<String> = Vec::new();
    if let Some(serde_json::Value::Object(map)) = tags_raw {
        if let Some(serde_json::Value::Array(arr)) = map.get("tags") {
            collect_strings(arr, &mut names);
        }
    }
    names.sort();
    names
}

fn collect_strings(arr: &[serde_json::Value], out: &mut Vec<String>) {
    for item in arr {
        match item {
            serde_json::Value::String(s) => {
                if !out.contains(s) {
                    out.push(s.clone());
                }
            }
            serde_json::Value::Array(inner) => collect_strings(inner, out),
            _ => {}
        }
    }
}

/// Merge tag names with their colors from tag_meta records using a HashMap
/// for O(n+m) instead of O(n*m).
pub fn merge_tags_with_colors(tag_names: Vec<String>, metas: Vec<TagMeta>) -> Vec<TagMeta> {
    let color_map: HashMap<String, String> = metas
        .into_iter()
        .map(|m| (m.name, m.color))
        .collect();

    tag_names
        .into_iter()
        .map(|name| {
            let color = color_map
                .get(&name)
                .cloned()
                .unwrap_or_else(|| DEFAULT_COLOR.to_string());
            TagMeta { name, color }
        })
        .collect()
}
