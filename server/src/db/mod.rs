use surrealdb::engine::any::Any;
use surrealdb::opt::auth::Root;
use surrealdb::Surreal;
use surrealdb_types::SurrealValue;
use tracing::info;

use crate::config::AppConfig;
use crate::models::post;

pub async fn init_db(config: &AppConfig) -> surrealdb::Result<Surreal<Any>> {
    let db = surrealdb::engine::any::connect(&config.surrealdb_url).await?;

    db.signin(Root {
        username: config.surrealdb_user.clone(),
        password: config.surrealdb_pass.clone(),
    })
    .await?;

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

    if count.as_ref().map_or(true, |c| c.total == 0) {
        info!("Seeding database with hello-world post...");

        db.query(
            r#"
            CREATE type::table($table) CONTENT {
                slug: "hello-world",
                locale: "en",
                title: "Hello, World",
                summary: "The very first devlog for Scylla Prelude. A short introduction to the project and what's ahead.",
                content: "We're just getting started. More entries will follow as the project progresses.",
                tags: ["announcement"],
                image: "/images/devlogs/devlog-1.png",
                authors: ["godlyjaaaj", "aquesau"],
                status: "published",
                created_at: d"2026-02-07T00:00:00Z",
                updated_at: d"2026-02-07T00:00:00Z"
            };
            CREATE type::table($table) CONTENT {
                slug: "hello-world",
                locale: "fr",
                title: "Hello, World",
                summary: "Le tout premier devlog de Scylla Prelude. Une courte introduction au projet et à ce qui vous attend.",
                content: "Nous ne faisons que commencer. D'autres articles suivront au fil de l'avancement du projet.",
                tags: ["announcement"],
                image: "/images/devlogs/devlog-1.png",
                authors: ["godlyjaaaj", "aquesau"],
                status: "published",
                created_at: d"2026-02-07T00:00:00Z",
                updated_at: d"2026-02-07T00:00:00Z"
            };
            "#,
        )
        .bind(("table", post::TABLE))
        .await?;

        info!("Seed data inserted (hello-world en + fr)");
    }

    Ok(())
}

#[derive(serde::Deserialize, SurrealValue)]
struct CountResult {
    total: u64,
}
