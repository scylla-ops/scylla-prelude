use axum::extract::{Query, State};
use axum::http::header;
use axum::response::IntoResponse;
use pulldown_cmark::{Options, Parser, html};
use rss::{ChannelBuilder, ItemBuilder};
use serde::Deserialize;

use crate::AppState;
use crate::error::AppError;
use crate::repo;

#[derive(Deserialize)]
pub struct RssParams {
    pub locale: Option<String>,
}

pub async fn feed(
    State(state): State<AppState>,
    Query(params): Query<RssParams>,
) -> Result<impl IntoResponse, AppError> {
    let locale = match params.locale.as_deref() {
        Some("en") => "en".to_string(),
        Some("fr") => "fr".to_string(),
        _ => "en".to_string(),
    };

    let posts = repo::post::list_for_rss(&state.db, &locale, 20).await?;

    let title = match locale.as_str() {
        "fr" => "Scylla Prelude - Devlog",
        _ => "Scylla Prelude - Devlog",
    };

    let items: Vec<_> = posts
        .into_iter()
        .map(|p| {
            let html_content = md_to_html(&p.content);
            let link = format!("{}/devlogs/{}", state.config.app_url, p.slug);

            ItemBuilder::default()
                .title(Some(p.title))
                .link(Some(link))
                .description(Some(p.summary))
                .content(Some(html_content))
                .pub_date(Some(p.created_at.to_rfc2822()))
                .categories(
                    p.tags
                        .into_iter()
                        .map(|t| rss::Category {
                            name: t,
                            domain: None,
                        })
                        .collect::<Vec<_>>(),
                )
                .build()
        })
        .collect();

    let channel = ChannelBuilder::default()
        .title(title)
        .link(state.config.app_url.clone())
        .description("Latest devlogs from Scylla Prelude")
        .items(items)
        .build();

    let xml = channel.to_string();

    Ok((
        [(
            header::CONTENT_TYPE,
            "application/rss+xml; charset=utf-8",
        )],
        xml,
    ))
}

fn md_to_html(markdown: &str) -> String {
    let parser = Parser::new_ext(markdown, Options::all());
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);
    html_output
}
