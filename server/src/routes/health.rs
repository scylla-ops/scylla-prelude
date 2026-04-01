use axum::Json;
use axum::extract::State;
use serde_json::{Value, json};

use crate::AppState;

pub async fn check(State(state): State<AppState>) -> Json<Value> {
    let db_ok = state.db.health().await.is_ok();
    let commit = option_env!("GIT_COMMIT").unwrap_or("dev");
    Json(json!({
        "status": if db_ok { "ok" } else { "degraded" },
        "database": if db_ok { "connected" } else { "unreachable" },
        "version": env!("CARGO_PKG_VERSION"),
        "commit": commit
    }))
}
