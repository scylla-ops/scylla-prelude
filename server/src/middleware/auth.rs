use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum_extra::extract::CookieJar;
use jsonwebtoken::{DecodingKey, Validation, decode};
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub name: String,
    pub avatar_url: String,
    pub exp: usize,
}

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub username: String,
    pub name: String,
    pub avatar_url: String,
}

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        // Try cookie first, then fall back to Authorization header
        let jar = CookieJar::from_request_parts(parts, state)
            .await
            .map_err(|_| AppError::Unauthorized)?;

        let token = jar
            .get("admin_token")
            .map(|c| c.value().to_owned())
            .or_else(|| {
                parts
                    .headers
                    .get("authorization")
                    .and_then(|v| v.to_str().ok())
                    .and_then(|h| h.strip_prefix("Bearer "))
                    .map(|t| t.to_owned())
            })
            .ok_or(AppError::Unauthorized)?;

        let key = DecodingKey::from_secret(state.config.jwt_secret.as_bytes());
        let validation = Validation::default();

        let token_data = decode::<Claims>(&token, &key, &validation)
            .map_err(|_| AppError::Unauthorized)?;

        Ok(AuthUser {
            username: token_data.claims.sub,
            name: token_data.claims.name,
            avatar_url: token_data.claims.avatar_url,
        })
    }
}
