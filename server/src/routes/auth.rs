use axum::Json;
use axum::extract::{Query, State};
use axum::response::{IntoResponse, Redirect};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use jsonwebtoken::{EncodingKey, Header, encode};
use serde::Deserialize;

use crate::AppState;
use crate::error::AppError;
use crate::middleware::auth::{AuthUser, Claims};

#[derive(Deserialize)]
pub struct CallbackParams {
    pub code: String,
}

#[derive(Deserialize)]
struct GithubTokenResponse {
    access_token: String,
}

#[derive(Deserialize)]
struct GithubUser {
    login: String,
    name: Option<String>,
    avatar_url: String,
}

pub async fn github_redirect(State(state): State<AppState>) -> Redirect {
    let url = format!(
        "https://github.com/login/oauth/authorize?client_id={}&redirect_uri={}/api/v1/auth/github/callback&scope=read:user",
        state.config.github_client_id,
        state.config.app_url,
    );
    Redirect::temporary(&url)
}

pub async fn github_callback(
    State(state): State<AppState>,
    Query(params): Query<CallbackParams>,
    jar: CookieJar,
) -> Result<(CookieJar, Redirect), AppError> {
    let client = reqwest::Client::new();

    // Exchange code for access token
    let token_resp: GithubTokenResponse = client
        .post("https://github.com/login/oauth/access_token")
        .header("Accept", "application/json")
        .json(&serde_json::json!({
            "client_id": state.config.github_client_id,
            "client_secret": state.config.github_client_secret,
            "code": params.code,
        }))
        .send()
        .await
        .map_err(|_| AppError::BadRequest("GitHub OAuth exchange failed".into()))?
        .json()
        .await
        .map_err(|_| AppError::BadRequest("Invalid GitHub token response".into()))?;

    // Fetch GitHub user info
    let github_user: GithubUser = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("Bearer {}", token_resp.access_token))
        .header("User-Agent", "scylla-prelude")
        .send()
        .await
        .map_err(|_| AppError::BadRequest("GitHub user fetch failed".into()))?
        .json()
        .await
        .map_err(|_| AppError::BadRequest("Invalid GitHub user response".into()))?;

    // Check whitelist (case-insensitive)
    let login_lower = github_user.login.to_lowercase();
    if !state
        .config
        .admin_github_usernames
        .iter()
        .any(|u| u.to_lowercase() == login_lower)
    {
        return Err(AppError::Unauthorized);
    }

    // Generate JWT
    let exp = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::days(7))
        .expect("valid timestamp")
        .timestamp() as usize;

    let claims = Claims {
        sub: github_user.login,
        name: github_user.name.unwrap_or_default(),
        avatar_url: github_user.avatar_url,
        exp,
    };

    let key = EncodingKey::from_secret(state.config.jwt_secret.as_bytes());
    let jwt = encode(&Header::default(), &claims, &key)
        .map_err(|_| AppError::BadRequest("JWT encoding failed".into()))?;

    // Set HttpOnly cookie scoped to API path, 7 days
    let cookie = Cookie::build(("admin_token", jwt))
        .path("/api/v1")
        .http_only(true)
        .same_site(SameSite::Lax)
        .max_age(time::Duration::days(7));

    let redirect_url = format!("{}/admin", state.config.app_url);
    Ok((jar.add(cookie), Redirect::temporary(&redirect_url)))
}

pub async fn me(auth: AuthUser) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "username": auth.username,
        "name": auth.name,
        "avatar_url": auth.avatar_url,
    }))
}

pub async fn logout(jar: CookieJar) -> impl IntoResponse {
    let cookie = Cookie::build(("admin_token", ""))
        .path("/api/v1")
        .http_only(true)
        .same_site(SameSite::Lax)
        .max_age(time::Duration::seconds(0));

    (jar.add(cookie), axum::http::StatusCode::NO_CONTENT)
}
