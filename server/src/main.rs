use server::config::AppConfig;
use server::{AppState, api_router, routes, scheduler};

use axum::Router;
use axum::http::header::CACHE_CONTROL;
use axum::http::{HeaderName, HeaderValue};
use axum::routing::get;
use std::net::SocketAddr;
use tower::ServiceBuilder;
use tower_http::LatencyUnit;
use tower_http::compression::CompressionLayer;
use tower_http::request_id::{MakeRequestUuid, SetRequestIdLayer};
use tower_http::services::{ServeDir, ServeFile};
use tower_http::set_header::SetResponseHeaderLayer;
use tower_http::trace::{DefaultMakeSpan, DefaultOnRequest, DefaultOnResponse, TraceLayer};
use tracing::{Level, info};
use tracing_subscriber::EnvFilter;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::fmt::layer()
                .pretty()
                .with_line_number(false)
                .with_file(false)
                .with_target(false),
        )
        .with(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "server=debug,tower_http=info,axum=trace".into()),
        )
        .init();

    let config = AppConfig::from_env();

    // Initialize SurrealDB
    let db = server::db::init_db(&config)
        .await
        .expect("Failed to initialize SurrealDB");

    let state = AppState {
        db: db.clone(),
        config: config.clone(),
    };

    // Spawn scheduled publication background task
    scheduler::spawn_publish_scheduler(db);

    // API routes
    let api = api_router(state.clone());

    // OG meta tags route — serves index.html with injected OG/Twitter tags for social crawlers
    let og_router = Router::new()
        .route("/devlogs/{slug}", get(routes::og::devlog_with_meta))
        .with_state(state);

    // Static file serving
    let x_request_id = HeaderName::from_static("x-request-id");
    let index_path = format!("{}/index.html", config.dist_path);

    let assets_path = format!("{}/assets", config.dist_path);
    let assets_service = ServeDir::new(assets_path);

    let cached_assets = ServiceBuilder::new()
        .layer(SetResponseHeaderLayer::overriding(
            CACHE_CONTROL,
            HeaderValue::from_static("public, max-age=31536000, immutable"),
        ))
        .service(assets_service);

    let spa_service = ServeDir::new(&config.dist_path).fallback(ServeFile::new(index_path));

    let assets_router = Router::new().nest_service("/assets", cached_assets);
    let spa_router = Router::new().fallback_service(spa_service);

    // Combine: API first, then OG meta, then static files, then SPA fallback
    let app = Router::new()
        .nest("/api/v1", api)
        .merge(og_router)
        .merge(assets_router)
        .merge(spa_router)
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::new().include_headers(true))
                .on_request(DefaultOnRequest::new().level(Level::INFO))
                .on_response(
                    DefaultOnResponse::new()
                        .level(Level::INFO)
                        .latency_unit(LatencyUnit::Micros),
                ),
        )
        .layer(SetResponseHeaderLayer::overriding(
            HeaderName::from_static("x-content-type-options"),
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            HeaderName::from_static("x-frame-options"),
            HeaderValue::from_static("SAMEORIGIN"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            HeaderName::from_static("x-xss-protection"),
            HeaderValue::from_static("1; mode=block"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            HeaderName::from_static("content-security-policy"),
            HeaderValue::from_static(
                "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https:;",
            ),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            HeaderName::from_static("permissions-policy"),
            HeaderValue::from_static(
                "camera=(), microphone=(), geolocation=(), fullscreen=(self)",
            ),
        ))
        .layer(CompressionLayer::new())
        .layer(SetRequestIdLayer::new(x_request_id, MakeRequestUuid));

    let addr = SocketAddr::from((config.host, config.port));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();

    info!("Listening on http://{}", addr);
    info!("Serving static files from: {}", config.dist_path);

    axum::serve(listener, app).await.unwrap();
}
