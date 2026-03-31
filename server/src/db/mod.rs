use surrealdb::engine::any::Any;
use surrealdb::opt::auth::Root;
use surrealdb::Surreal;
use surrealdb_types::SurrealValue;
use tracing::info;

use crate::config::AppConfig;
use crate::models::post::{self, CreatePost, post_key};

pub async fn init_db(config: &AppConfig) -> surrealdb::Result<Surreal<Any>> {
    let db = surrealdb::engine::any::connect(&config.surrealdb_url).await?;

    // Only sign in for remote connections (ws:// or http://), not embedded
    let is_remote = config.surrealdb_url.starts_with("ws://")
        || config.surrealdb_url.starts_with("wss://")
        || config.surrealdb_url.starts_with("http://")
        || config.surrealdb_url.starts_with("https://");

    if is_remote {
        db.signin(Root {
            username: config.surrealdb_user.clone(),
            password: config.surrealdb_pass.clone(),
        })
        .await?;
    }

    db.use_ns(&config.surrealdb_ns)
        .use_db(&config.surrealdb_db)
        .await?;

    db.query(include_str!("schema.surql")).await?;
    info!("SurrealDB schema applied");

    seed_if_empty(&db).await?;

    Ok(db)
}

async fn seed_if_empty(db: &Surreal<Any>) -> surrealdb::Result<()> {
    let mut result = db
        .query("SELECT count() AS total FROM type::table($table) GROUP ALL")
        .bind(("table", post::TABLE))
        .await?;
    let count: Option<CountResult> = result.take(0)?;

    if count.as_ref().is_none_or(|c| c.total == 0) {
        info!("Seeding database with hello-world post...");

        let _: Option<post::Post> = db
            .create((post::TABLE, &*post_key("hello-world", "en")))
            .content(CreatePost {
                slug: "hello-world".into(),
                locale: "en".into(),
                title: "Hello, World".into(),
                summary: "The very first devlog for Scylla Prelude. A short introduction to the project and what's ahead.".into(),
                content: "We're just getting started. More entries will follow as the project progresses.".into(),
                tags: vec!["announcement".into()],
                image: Some("/images/devlogs/devlog-1.png".into()),
                image_position: None,
                authors: vec!["godlyjaaaj".into(), "aquesau".into()],
                reading_time: 1,
                status: "published".into(),
                published_at: None,
            })
            .await?;

        let _: Option<post::Post> = db
            .create((post::TABLE, &*post_key("hello-world", "fr")))
            .content(CreatePost {
                slug: "hello-world".into(),
                locale: "fr".into(),
                title: "Hello, World".into(),
                summary: "Le tout premier devlog de Scylla Prelude. Une courte introduction au projet et à ce qui vous attend.".into(),
                content: "Nous ne faisons que commencer. D'autres articles suivront au fil de l'avancement du projet.".into(),
                tags: vec!["announcement".into()],
                image: Some("/images/devlogs/devlog-1.png".into()),
                image_position: None,
                authors: vec!["godlyjaaaj".into(), "aquesau".into()],
                reading_time: 1,
                status: "published".into(),
                published_at: None,
            })
            .await?;

        info!("Seed data inserted (hello-world en + fr)");
    }

    Ok(())
}

#[derive(serde::Deserialize, SurrealValue)]
struct CountResult {
    total: u64,
}
