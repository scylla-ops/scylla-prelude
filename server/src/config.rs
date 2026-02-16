use std::env;
use std::net::IpAddr;

pub(super) struct AppConfig {
    pub(crate) host: IpAddr,
    pub(crate) port: u16,
    pub(crate) dist_path: String,
}

impl AppConfig {
    pub(crate) fn from_env() -> Self {
        let host = env::var("HOST")
            .unwrap_or_else(|_| "0.0.0.0".to_string())
            .parse()
            .expect("HOST doit être une adresse IP valide");

        let port = env::var("PORT")
            .unwrap_or_else(|_| "8080".to_string())
            .parse()
            .expect("PORT doit être un nombre valide");

        let dist_path = env::var("DIST_PATH").unwrap_or_else(|_| "dist".to_string());

        Self {
            host,
            port,
            dist_path,
        }
    }
}
