use axum::Json;
use axum::extract::{Path, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::IntoResponse;

use crate::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::media::{self, Media, MediaSummary};
use surrealdb_types::Bytes as SurrealBytes;

/// List all uploaded media metadata (admin only, no binary data)
pub async fn list_media(
    State(state): State<AppState>,
    _auth: AuthUser,
) -> Result<Json<Vec<MediaListItem>>, AppError> {
    let mut result = state
        .db
        .query(
            "SELECT id, filename, mime_type, size, width, height, created_at
             FROM type::table($table)
             ORDER BY created_at DESC",
        )
        .bind(("table", media::TABLE))
        .await?;
    let items: Vec<MediaSummary> = result.take(0)?;

    // Build URL from record ID
    let list: Vec<MediaListItem> = items
        .into_iter()
        .map(|m| {
            let id_str = record_id_to_string(&m.id);
            MediaListItem {
                id: id_str.clone(),
                filename: m.filename,
                mime_type: m.mime_type,
                size: m.size,
                width: m.width,
                height: m.height,
                url: format!("/api/v1/media/{}/raw", id_str),
                created_at: m.created_at,
            }
        })
        .collect();

    Ok(Json(list))
}

/// Delete a media record (admin only) — no filesystem cleanup needed
pub async fn delete_media(
    State(state): State<AppState>,
    _auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let mut result = state
        .db
        .query("DELETE type::record($table, $id) RETURN BEFORE")
        .bind(("table", media::TABLE))
        .bind(("id", id))
        .await?;
    let deleted: Option<MediaSummary> = result.take(0)?;

    if deleted.is_none() {
        return Err(AppError::NotFound);
    }

    Ok(Json(serde_json::json!({ "ok": true })))
}

/// Upload image: store bytes directly in SurrealDB
pub async fn upload_image(
    State(state): State<AppState>,
    _auth: AuthUser,
    mut multipart: axum::extract::Multipart,
) -> Result<Json<MediaListItem>, AppError> {
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(e.to_string()))?
    {
        let filename = field
            .file_name()
            .map(|s| s.to_string())
            .unwrap_or_else(|| "upload".to_string());

        let content_type = field
            .content_type()
            .map(|s| s.to_string())
            .unwrap_or_else(|| "application/octet-stream".to_string());

        let ext = filename
            .rsplit('.')
            .next()
            .unwrap_or("bin")
            .to_lowercase();

        if !matches!(ext.as_str(), "png" | "jpg" | "jpeg" | "webp" | "gif") {
            return Err(AppError::BadRequest(
                "Only png, jpg, jpeg, webp, gif allowed".into(),
            ));
        }

        let data = field
            .bytes()
            .await
            .map_err(|e| AppError::BadRequest(e.to_string()))?;

        if data.len() > 5 * 1024 * 1024 {
            return Err(AppError::BadRequest("File too large (max 5MB)".into()));
        }

        let (width, height) = parse_image_dimensions(&data);
        let size = data.len() as u64;

        // Store bytes directly in SurrealDB
        let mut result = state
            .db
            .query(
                "CREATE type::table($table) CONTENT {
                    filename: $filename,
                    mime_type: $mime_type,
                    size: $size,
                    width: $width,
                    height: $height,
                    data: $data
                }",
            )
            .bind(("table", media::TABLE))
            .bind(("filename", filename.clone()))
            .bind(("mime_type", content_type.clone()))
            .bind(("size", size))
            .bind(("width", width))
            .bind(("height", height))
            .bind(("data", SurrealBytes::from(data.to_vec())))
            .await?;
        let record: Option<MediaSummary> = result.take(0)?;

        if let Some(m) = record {
            let id_str = record_id_to_string(&m.id);
            return Ok(Json(MediaListItem {
                id: id_str.clone(),
                filename: m.filename,
                mime_type: m.mime_type,
                size: m.size,
                width: m.width,
                height: m.height,
                url: format!("/api/v1/media/{}/raw", id_str),
                created_at: m.created_at,
            }));
        } else {
            return Err(AppError::BadRequest("Failed to create media record".into()));
        }
    }

    Err(AppError::BadRequest("No file provided".into()))
}

/// Serve image bytes directly from SurrealDB with caching headers
pub async fn serve_image(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, StatusCode> {
    let mut result = state
        .db
        .query("SELECT * FROM type::record($table, $id)")
        .bind(("table", media::TABLE))
        .bind(("id", id.clone()))
        .await
        .map_err(|e| {
            tracing::error!("DB query error for media/{}: {:?}", id, e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let record: Option<Media> = result.take(0).map_err(|e| {
        tracing::error!("Deserialization error for media/{}: {:?}", id, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let media = record.ok_or(StatusCode::NOT_FOUND)?;

    let mut headers = HeaderMap::new();
    headers.insert(
        "content-type",
        HeaderValue::from_str(&media.mime_type).unwrap_or(HeaderValue::from_static("application/octet-stream")),
    );
    headers.insert(
        "cache-control",
        HeaderValue::from_static("public, max-age=31536000, immutable"),
    );

    let body: Vec<u8> = media.data.to_vec();
    Ok((headers, body))
}

/// List all distinct tags used across posts
pub async fn list_tags(
    State(state): State<AppState>,
    _auth: AuthUser,
) -> Result<Json<Vec<String>>, AppError> {
    let mut result = state
        .db
        .query("SELECT tags FROM post GROUP ALL")
        .await?;
    let tags_raw: Option<serde_json::Value> = result.take(0)?;

    let mut tags: Vec<String> = Vec::new();
    if let Some(serde_json::Value::Object(map)) = tags_raw {
        if let Some(serde_json::Value::Array(arr)) = map.get("tags") {
            for item in arr {
                if let serde_json::Value::String(t) = item {
                    if !tags.contains(t) {
                        tags.push(t.clone());
                    }
                } else if let serde_json::Value::Array(inner) = item {
                    for t in inner {
                        if let serde_json::Value::String(s) = t {
                            if !tags.contains(s) {
                                tags.push(s.clone());
                            }
                        }
                    }
                }
            }
        }
    }

    tags.sort();
    Ok(Json(tags))
}

/// Upsert tag color (admin only)
pub async fn upsert_tag_color(
    State(state): State<AppState>,
    _auth: AuthUser,
    Json(req): Json<TagColorRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Upsert: update if exists, create if not
    state
        .db
        .query(
            "DELETE FROM type::table($table) WHERE name = $name; \
             CREATE type::table($table) CONTENT { name: $name, color: $color }",
        )
        .bind(("table", crate::models::tag_meta::TABLE))
        .bind(("name", req.name.clone()))
        .bind(("color", req.color.clone()))
        .await?;

    Ok(Json(serde_json::json!({ "ok": true })))
}

#[derive(serde::Deserialize)]
pub struct TagColorRequest {
    pub name: String,
    pub color: String,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/// JSON shape returned to the frontend (includes computed `url`)
#[derive(serde::Serialize)]
pub struct MediaListItem {
    pub id: String,
    pub filename: String,
    pub mime_type: String,
    pub size: u64,
    pub width: u32,
    pub height: u32,
    pub url: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Extract the ID key string from a SurrealDB RecordId
fn record_id_to_string(id: &Option<surrealdb_types::RecordId>) -> String {
    match id {
        Some(rid) => {
            match &rid.key {
                surrealdb_types::RecordIdKey::String(s) => s.clone(),
                surrealdb_types::RecordIdKey::Uuid(u) => u.to_string(),
                surrealdb_types::RecordIdKey::Number(n) => n.to_string(),
                other => format!("{:?}", other),
            }
        }
        None => String::new(),
    }
}

/// Parse basic image dimensions from raw bytes (supports JPEG, PNG, GIF, WebP)
fn parse_image_dimensions(data: &[u8]) -> (u32, u32) {
    if data.len() < 30 {
        return (0, 0);
    }

    // PNG: bytes 16-23 contain width and height as u32 big-endian
    if data.starts_with(b"\x89PNG") {
        let w = u32::from_be_bytes([data[16], data[17], data[18], data[19]]);
        let h = u32::from_be_bytes([data[20], data[21], data[22], data[23]]);
        return (w, h);
    }

    // GIF: bytes 6-9 contain width and height as u16 little-endian
    if data.starts_with(b"GIF8") {
        let w = u16::from_le_bytes([data[6], data[7]]) as u32;
        let h = u16::from_le_bytes([data[8], data[9]]) as u32;
        return (w, h);
    }

    // WebP: RIFF header, then VP8 chunk
    if data.starts_with(b"RIFF") && data.len() > 30 && &data[8..12] == b"WEBP" {
        if &data[12..16] == b"VP8 " && data.len() > 30 {
            let w = u16::from_le_bytes([data[26], data[27]]) as u32 & 0x3FFF;
            let h = u16::from_le_bytes([data[28], data[29]]) as u32 & 0x3FFF;
            return (w, h);
        }
        if &data[12..16] == b"VP8L" && data.len() > 25 {
            let bits = u32::from_le_bytes([data[21], data[22], data[23], data[24]]);
            let w = (bits & 0x3FFF) + 1;
            let h = ((bits >> 14) & 0x3FFF) + 1;
            return (w, h);
        }
    }

    // JPEG: scan for SOF markers
    if data[0] == 0xFF && data[1] == 0xD8 {
        let mut i = 2;
        while i + 9 < data.len() {
            if data[i] != 0xFF {
                i += 1;
                continue;
            }
            let marker = data[i + 1];
            if matches!(marker, 0xC0 | 0xC1 | 0xC2) {
                let h = u16::from_be_bytes([data[i + 5], data[i + 6]]) as u32;
                let w = u16::from_be_bytes([data[i + 7], data[i + 8]]) as u32;
                return (w, h);
            }
            let len = u16::from_be_bytes([data[i + 2], data[i + 3]]) as usize;
            i += 2 + len;
        }
    }

    (0, 0)
}
