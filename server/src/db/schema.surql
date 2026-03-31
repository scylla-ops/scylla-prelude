-- Media uploads (image bytes stored in DB)
DEFINE TABLE IF NOT EXISTS media SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS filename   ON media TYPE string ASSERT $value != "";
DEFINE FIELD IF NOT EXISTS mime_type  ON media TYPE string ASSERT $value != "";
DEFINE FIELD IF NOT EXISTS size       ON media TYPE int ASSERT $value >= 0;
DEFINE FIELD IF NOT EXISTS width      ON media TYPE int DEFAULT 0;
DEFINE FIELD IF NOT EXISTS height     ON media TYPE int DEFAULT 0;
DEFINE FIELD IF NOT EXISTS data       ON media TYPE bytes;
DEFINE FIELD IF NOT EXISTS created_at ON media TYPE datetime DEFAULT time::now();
DEFINE INDEX IF NOT EXISTS idx_media_created_at ON media FIELDS created_at;

-- Blog posts
DEFINE TABLE IF NOT EXISTS post SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS slug       ON post TYPE string ASSERT $value != "";
DEFINE FIELD IF NOT EXISTS locale     ON post TYPE string ASSERT $value IN ["en", "fr"];
DEFINE FIELD IF NOT EXISTS title      ON post TYPE string ASSERT $value != "";
DEFINE FIELD IF NOT EXISTS summary    ON post TYPE string ASSERT $value != "";
DEFINE FIELD IF NOT EXISTS content    ON post TYPE string;
DEFINE FIELD IF NOT EXISTS tags       ON post TYPE array<string>;
DEFINE FIELD IF NOT EXISTS image      ON post TYPE option<string>;
DEFINE FIELD IF NOT EXISTS image_position ON post TYPE option<string> DEFAULT NONE;
DEFINE FIELD IF NOT EXISTS authors    ON post TYPE array<string>;
DEFINE FIELD IF NOT EXISTS reading_time ON post TYPE int DEFAULT 1 ASSERT $value >= 1 AND $value <= 999;
DEFINE FIELD IF NOT EXISTS status     ON post TYPE string ASSERT $value IN ["draft", "published", "scheduled"] DEFAULT "draft";
DEFINE FIELD IF NOT EXISTS published_at ON post TYPE option<datetime>;
DEFINE FIELD IF NOT EXISTS created_at ON post TYPE datetime DEFAULT time::now();
DEFINE FIELD IF NOT EXISTS updated_at ON post TYPE datetime DEFAULT time::now();
DEFINE INDEX IF NOT EXISTS idx_post_slug_locale ON post FIELDS slug, locale UNIQUE;
DEFINE INDEX IF NOT EXISTS idx_post_status ON post FIELDS status, locale, created_at;

-- Tag metadata (colors)
DEFINE TABLE IF NOT EXISTS tag_meta SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS name  ON tag_meta TYPE string ASSERT $value != "";
DEFINE FIELD IF NOT EXISTS color ON tag_meta TYPE string DEFAULT "#6b7280" ASSERT string::matches($value, "^#[0-9a-fA-F]{6}$");
DEFINE INDEX IF NOT EXISTS idx_tag_meta_name ON tag_meta FIELDS name UNIQUE;
