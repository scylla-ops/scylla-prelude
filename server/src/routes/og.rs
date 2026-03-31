use axum::extract::{Path, State};
use axum::response::{Html, IntoResponse};

use crate::AppState;
use crate::models::post::Post;
use crate::repo;

/// Serves the SPA index.html with OG/Twitter meta tags injected for social media crawlers.
/// Falls through to the normal SPA for non-crawler requests (handled by fallback).
pub async fn devlog_with_meta(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> impl IntoResponse {
    // Try to load the post (default to english for OG tags)
    let post = fetch_post_for_og(&state, &slug).await;

    // Read the SPA index.html
    let index_path = format!("{}/index.html", state.config.dist_path);
    let html = match tokio::fs::read_to_string(&index_path).await {
        Ok(h) => h,
        Err(_) => return Html("<html><body>Error</body></html>".to_string()).into_response(),
    };

    match post {
        Some(post) => {
            let meta_tags = build_meta_tags(&post, &state.config.app_url);
            // Inject meta tags right before </head>
            let html = html.replace("</head>", &format!("{meta_tags}\n</head>"));
            Html(html).into_response()
        }
        None => {
            // No post found — serve the SPA as-is (React will show 404)
            Html(html).into_response()
        }
    }
}

async fn fetch_post_for_og(state: &AppState, slug: &str) -> Option<Post> {
    // Try English first, then fall back to French
    for locale in ["en", "fr"] {
        if let Ok(Some(post)) = repo::post::get_published(&state.db, slug, locale).await {
            return Some(post);
        }
    }
    None
}

fn build_meta_tags(post: &Post, app_url: &str) -> String {
    let url = format!("{}/devlogs/{}", app_url, post.slug);
    let title = html_escape(&post.title);
    let description = html_escape(&post.summary);
    let image = post
        .image
        .as_ref()
        .map(|img| {
            if img.starts_with("http") {
                img.clone()
            } else {
                format!("{}{}", app_url, img)
            }
        })
        .unwrap_or_default();

    let mut tags = String::new();

    // OpenGraph
    tags.push_str(r#"<meta property="og:type" content="article" />"#);
    tags.push('\n');
    tags.push_str(&format!(
        r#"<meta property="og:title" content="{title}" />"#
    ));
    tags.push('\n');
    tags.push_str(&format!(
        r#"<meta property="og:description" content="{description}" />"#
    ));
    tags.push('\n');
    tags.push_str(&format!(r#"<meta property="og:url" content="{url}" />"#));
    tags.push('\n');
    if !image.is_empty() {
        tags.push_str(&format!(
            r#"<meta property="og:image" content="{image}" />"#
        ));
        tags.push('\n');
    }
    tags.push_str(r#"<meta property="og:site_name" content="Scylla Prelude" />"#);
    tags.push('\n');

    // Twitter Card
    tags.push_str(r#"<meta name="twitter:card" content="summary_large_image" />"#);
    tags.push('\n');
    tags.push_str(&format!(
        r#"<meta name="twitter:title" content="{title}" />"#
    ));
    tags.push('\n');
    tags.push_str(&format!(
        r#"<meta name="twitter:description" content="{description}" />"#
    ));
    tags.push('\n');
    if !image.is_empty() {
        tags.push_str(&format!(
            r#"<meta name="twitter:image" content="{image}" />"#
        ));
        tags.push('\n');
    }

    // Article metadata
    tags.push_str(&format!(
        r#"<meta property="article:published_time" content="{}" />"#,
        post.created_at.to_rfc3339()
    ));
    tags.push('\n');
    for tag in &post.tags {
        tags.push_str(&format!(
            r#"<meta property="article:tag" content="{}" />"#,
            html_escape(tag)
        ));
        tags.push('\n');
    }

    tags
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}
