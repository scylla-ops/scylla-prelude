use std::env;
use std::net::IpAddr;

#[derive(Clone)]
pub struct AppConfig {
    pub host: IpAddr,
    pub port: u16,
    pub dist_path: String,
    pub surrealdb_url: String,
    pub surrealdb_ns: String,
    pub surrealdb_db: String,
    pub surrealdb_user: String,
    pub surrealdb_pass: String,
    pub github_client_id: String,
    pub github_client_secret: String,
    pub jwt_secret: String,
    pub admin_github_usernames: Vec<String>,
    pub app_url: String,
}

impl AppConfig {
    pub fn from_env() -> Self {
        let host = env::var("HOST")
            .unwrap_or_else(|_| "0.0.0.0".to_string())
            .parse()
            .expect("HOST doit être une adresse IP valide");

        let port = env::var("PORT")
            .unwrap_or_else(|_| "8080".to_string())
            .parse()
            .expect("PORT doit être un nombre valide");

        let dist_path = env::var("DIST_PATH").unwrap_or_else(|_| "dist".to_string());

        let surrealdb_url =
            env::var("SURREALDB_URL").unwrap_or_else(|_| "ws://localhost:8000".to_string());
        let surrealdb_ns = env::var("SURREALDB_NS").unwrap_or_else(|_| "scylla".to_string());
        let surrealdb_db = env::var("SURREALDB_DB").unwrap_or_else(|_| "prelude".to_string());
        let surrealdb_user = env::var("SURREALDB_USER").unwrap_or_else(|_| "root".to_string());
        let surrealdb_pass = env::var("SURREALDB_PASS").unwrap_or_else(|_| "root".to_string());

        let github_client_id = env::var("GITHUB_CLIENT_ID").unwrap_or_default();
        let github_client_secret = env::var("GITHUB_CLIENT_SECRET").unwrap_or_default();
        let jwt_secret = env::var("JWT_SECRET").unwrap_or_else(|_| "change-me-in-prod".to_string());
        let admin_github_usernames = env::var("ADMIN_GITHUB_USERNAMES")
            .unwrap_or_default()
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        let app_url =
            env::var("APP_URL").unwrap_or_else(|_| "http://localhost:5173".to_string());

        Self {
            host,
            port,
            dist_path,
            surrealdb_url,
            surrealdb_ns,
            surrealdb_db,
            surrealdb_user,
            surrealdb_pass,
            github_client_id,
            github_client_secret,
            jwt_secret,
            admin_github_usernames,
            app_url,
        }
    }

    pub fn warn_insecure_defaults(&self) {
        if self.jwt_secret == "change-me-in-prod" {
            tracing::warn!("JWT_SECRET is using the default value — change this in production!");
        }
        if self.surrealdb_user == "root" && self.surrealdb_pass == "root" {
            tracing::warn!("SurrealDB is using default root/root credentials — change this in production!");
        }
        if self.github_client_id.is_empty() {
            tracing::warn!("GITHUB_CLIENT_ID is empty — OAuth login will not work");
        }
        if self.admin_github_usernames.is_empty() {
            tracing::warn!("ADMIN_GITHUB_USERNAMES is empty — no users will have admin access");
        }
    }
}
