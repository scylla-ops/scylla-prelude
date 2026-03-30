use axum::Json;
use axum::extract::State;
use serde_json::{Value, json};

use crate::AppState;

pub async fn check(State(state): State<AppState>) -> Json<Value> {
    let db_ok = state.db.health().await.is_ok();
    Json(json!({
        "status": if db_ok { "ok" } else { "degraded" },
        "database": if db_ok { "connected" } else { "unreachable" }
    }))
}
