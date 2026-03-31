use crate::error::AppError;

/// Slug must be lowercase alphanumeric with hyphens, 1-128 chars
pub fn validate_slug(s: &str) -> Result<(), AppError> {
    if s.is_empty() || s.len() > 128 {
        return Err(AppError::BadRequest(
            "slug must be 1-128 characters".into(),
        ));
    }
    if !s
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
    {
        return Err(AppError::BadRequest(
            "slug must contain only lowercase letters, digits, and hyphens".into(),
        ));
    }
    if s.starts_with('-') || s.ends_with('-') {
        return Err(AppError::BadRequest(
            "slug must not start or end with a hyphen".into(),
        ));
    }
    Ok(())
}

pub fn validate_locale(s: &str) -> Result<(), AppError> {
    if !matches!(s, "en" | "fr") {
        return Err(AppError::BadRequest(
            "locale must be 'en' or 'fr'".into(),
        ));
    }
    Ok(())
}

pub fn validate_status(s: &str) -> Result<(), AppError> {
    if !matches!(s, "draft" | "published" | "scheduled") {
        return Err(AppError::BadRequest(
            "status must be 'draft', 'published', or 'scheduled'".into(),
        ));
    }
    Ok(())
}

/// Hex color: #RRGGBB
pub fn validate_tag_color(s: &str) -> Result<(), AppError> {
    if s.len() != 7
        || !s.starts_with('#')
        || !s[1..].chars().all(|c| c.is_ascii_hexdigit())
    {
        return Err(AppError::BadRequest(
            "color must be a hex color like #FF00AA".into(),
        ));
    }
    Ok(())
}

pub fn validate_tag_name(s: &str) -> Result<(), AppError> {
    if s.is_empty() || s.len() > 50 {
        return Err(AppError::BadRequest(
            "tag name must be 1-50 characters".into(),
        ));
    }
    if s.chars().any(|c| c.is_control()) {
        return Err(AppError::BadRequest(
            "tag name must not contain control characters".into(),
        ));
    }
    Ok(())
}

use crate::routes::admin::CreatePostRequest;

pub fn validate_post_fields(req: &CreatePostRequest) -> Result<(), AppError> {
    validate_slug(&req.slug)?;
    validate_locale(&req.locale)?;
    validate_status(&req.status)?;

    if req.title.trim().is_empty() {
        return Err(AppError::BadRequest("title must not be empty".into()));
    }
    if req.title.len() > 200 {
        return Err(AppError::BadRequest(
            "title must be at most 200 characters".into(),
        ));
    }
    if req.summary.trim().is_empty() {
        return Err(AppError::BadRequest("summary must not be empty".into()));
    }
    if req.summary.len() > 500 {
        return Err(AppError::BadRequest(
            "summary must be at most 500 characters".into(),
        ));
    }
    if req.content.len() > 500 * 1024 {
        return Err(AppError::BadRequest(
            "content must be at most 500KB".into(),
        ));
    }
    if req.tags.len() > 10 {
        return Err(AppError::BadRequest(
            "at most 10 tags allowed".into(),
        ));
    }
    for tag in &req.tags {
        validate_tag_name(tag)?;
    }
    if req.authors.len() > 10 {
        return Err(AppError::BadRequest(
            "at most 10 authors allowed".into(),
        ));
    }
    Ok(())
}
