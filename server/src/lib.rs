pub mod config;
pub mod db;
pub mod error;
pub mod middleware;
pub mod models;
pub mod routes;
pub mod scheduler;

use axum::Router;
use axum::routing::{delete, get, post, put};
use surrealdb::engine::any::Any;
use surrealdb::Surreal;

use crate::config::AppConfig;

#[derive(Clone)]
pub struct AppState {
    pub db: Surreal<Any>,
    pub config: AppConfig,
}

/// Build the API router (used by main and integration tests)
pub fn api_router(state: AppState) -> Router {
    Router::new()
        // Public
        .route("/health", get(routes::health::check))
        .route("/posts", get(routes::posts::list_posts))
        .route("/posts/{slug}", get(routes::posts::get_post))
        // RSS
        .route("/rss", get(routes::rss::feed))
        // Auth
        .route("/auth/github", get(routes::auth::github_redirect))
        .route(
            "/auth/github/callback",
            get(routes::auth::github_callback),
        )
        .route("/auth/me", get(routes::auth::me))
        // Admin (JWT required)
        .route("/admin/posts", get(routes::admin::list_all_posts))
        .route("/admin/posts", post(routes::admin::create_post))
        .route("/admin/posts/{slug}", get(routes::admin::get_post))
        .route("/admin/posts/{slug}", put(routes::admin::update_post))
        .route("/admin/posts/{slug}", delete(routes::admin::delete_post))
        .route("/admin/upload", post(routes::admin::upload_image))
        .with_state(state)
}
