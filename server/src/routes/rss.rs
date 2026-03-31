use axum::extract::{Query, State};
use axum::http::header;
use axum::response::IntoResponse;
use pulldown_cmark::{Options, Parser, html};
use rss::{ChannelBuilder, Enclosure, Guid, ItemBuilder};
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
    let app_url = &state.config.app_url;

    let title = match locale.as_str() {
        "fr" => "Scylla Prelude - Devlog",
        _ => "Scylla Prelude - Devlog",
    };

    let description = match locale.as_str() {
        "fr" => "Derniers devlogs de Scylla Prelude",
        _ => "Latest devlogs from Scylla Prelude",
    };

    let last_build_date = posts.first().map(|p| {
        p.published_at
            .unwrap_or(p.created_at)
            .to_rfc2822()
    });

    let items: Vec<_> = posts
        .into_iter()
        .map(|p| {
            let html_content = md_to_html(&p.content);
            let link = format!("{app_url}/devlogs/{}", p.slug);
            let pub_date = p.published_at.unwrap_or(p.created_at).to_rfc2822();

            let desc = format!("\u{23f1}\u{fe0f} {} min — {}", p.reading_time, p.summary);

            let author = if p.authors.is_empty() {
                None
            } else {
                Some(p.authors.join(", "))
            };

            let enclosure = p.image.as_ref().map(|img| {
                let url = if img.starts_with("http") {
                    img.clone()
                } else {
                    format!("{app_url}{img}")
                };
                Enclosure {
                    url,
                    length: "0".to_string(),
                    mime_type: "image/jpeg".to_string(),
                }
            });

            let guid = Guid {
                value: link.clone(),
                permalink: true,
            };

            ItemBuilder::default()
                .title(Some(p.title))
                .link(Some(link))
                .description(Some(desc))
                .content(Some(html_content))
                .author(author)
                .pub_date(Some(pub_date))
                .guid(Some(guid))
                .enclosure(enclosure)
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

    let mut builder = ChannelBuilder::default();
    builder
        .title(title)
        .link(app_url.clone())
        .description(description)
        .language(Some(locale.clone()))
        .items(items);

    if let Some(date) = last_build_date {
        builder.last_build_date(Some(date));
    }

    let channel = builder.build();
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
