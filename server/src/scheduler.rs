use std::time::Duration;

use surrealdb::Surreal;
use surrealdb::engine::any::Any;
use tracing::{debug, error, info};

use surrealdb_types::SurrealValue;

use crate::models::post;

/// Spawn a background task that publishes scheduled posts when their `published_at` time has passed.
/// Checks every 60 seconds.
pub fn spawn_publish_scheduler(db: Surreal<Any>) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(60));
        loop {
            interval.tick().await;
            if let Err(e) = publish_due_posts(&db).await {
                error!("Scheduler error: {e}");
            }
        }
    });
}

async fn publish_due_posts(db: &Surreal<Any>) -> surrealdb::Result<()> {
    let mut result = db
        .query(
            "UPDATE type::table($table) SET status = 'published', updated_at = time::now()
             WHERE status = 'scheduled' AND published_at != NONE AND published_at <= time::now()
             RETURN slug, locale",
        )
        .bind(("table", post::TABLE))
        .await?;

    let published: Vec<SlugLocale> = result.take(0)?;
    if !published.is_empty() {
        for p in &published {
            info!("Auto-published: {}/{}", p.slug, p.locale);
        }
    } else {
        debug!("Scheduler tick: no posts to publish");
    }

    Ok(())
}

#[derive(serde::Deserialize, surrealdb_types::SurrealValue)]
struct SlugLocale {
    slug: String,
    locale: String,
}
