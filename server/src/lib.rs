pub mod config;
pub mod db;
pub mod error;
pub mod middleware;
pub mod models;
pub mod repo;
pub mod routes;
pub mod scheduler;
pub mod validation;

use axum::Router;
use axum::routing::{delete, get, patch, post, put};
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
        .route("/tags", get(routes::posts::list_tags))
        // RSS
        .route("/rss", get(routes::rss::feed))
        // Auth
        .route("/auth/github", get(routes::auth::github_redirect))
        .route(
            "/auth/github/callback",
            get(routes::auth::github_callback),
        )
        .route("/auth/me", get(routes::auth::me))
        .route("/auth/logout", post(routes::auth::logout))
        // Admin (JWT required)
        .route("/admin/posts", get(routes::admin::list_all_posts))
        .route("/admin/posts", post(routes::admin::create_post))
        .route("/admin/posts/{slug}", get(routes::admin::get_post))
        .route("/admin/posts/{slug}", put(routes::admin::update_post))
        .route("/admin/posts/{slug}/status", patch(routes::admin::patch_post_status))
        .route("/admin/posts/{slug}", delete(routes::admin::delete_post))
        .route("/admin/upload", post(routes::media::upload_image))
        .route("/admin/media", get(routes::media::list_media))
        .route("/admin/media/{id}", delete(routes::media::delete_media))
        .route("/admin/tags", get(routes::media::list_tags))
        .route("/admin/tags/color", put(routes::media::upsert_tag_color))
        // Public media serving from DB with cache headers
        .route("/media/{id}/raw", get(routes::media::serve_image))
        .with_state(state)
}
