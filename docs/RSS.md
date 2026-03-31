# RSS Feed API

## Endpoint

```
GET /api/v1/rss
```

## Parameters

| Parameter | Type   | Default | Description                |
|-----------|--------|---------|----------------------------|
| `locale`  | string | `en`    | Language filter: `en`, `fr` |

## Response

- **Content-Type:** `application/rss+xml; charset=utf-8`
- **Format:** RSS 2.0 XML
- **Items:** Up to 20 most recent published posts, ordered by date (newest first)

## Channel fields

| Field            | Description                                |
|------------------|--------------------------------------------|
| `<title>`        | "Scylla Prelude - Devlog"                  |
| `<link>`         | Site URL                                   |
| `<description>`  | Localized feed description                 |
| `<language>`     | Feed locale (`en` or `fr`)                 |
| `<lastBuildDate>` | Publication date of the most recent post  |

## Item fields

| Field           | Description                                              | Example                                              |
|-----------------|----------------------------------------------------------|------------------------------------------------------|
| `<title>`       | Post title                                               | `My Post Title`                                      |
| `<link>`        | Full URL to the post                                     | `https://prelude.scylla.dev/devlogs/my-post`         |
| `<guid>`        | Permanent link (same as `<link>`, used for deduplication) | `https://prelude.scylla.dev/devlogs/my-post`         |
| `<description>` | Reading time + summary                                   | `<description>&#9201;&#65039; 3 min — Short summary</description>` |
| `<content>`     | Full post content rendered as HTML (from Markdown)       | `<h1>Hello</h1><p>Full content...</p>`               |
| `<author>`      | Comma-separated author names (omitted if none)           | `Alice, Bob`                                         |
| `<pubDate>`     | Publication date in RFC 2822 format                      | `Mon, 01 Apr 2026 12:00:00 +0000`                   |
| `<category>`    | One element per tag                                      | `<category>rust</category>`                          |
| `<enclosure>`   | Post cover image (omitted if no image)                   | `<enclosure url="https://..." length="0" type="image/jpeg" />` |

## Example response

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Scylla Prelude - Devlog</title>
    <link>https://prelude.scylla.dev</link>
    <description>Latest devlogs from Scylla Prelude</description>
    <language>en</language>
    <lastBuildDate>Mon, 01 Apr 2026 12:00:00 +0000</lastBuildDate>
    <item>
      <title>New CI Pipeline</title>
      <link>https://prelude.scylla.dev/devlogs/new-ci-pipeline</link>
      <description>&#9201;&#65039; 5 min — We rebuilt our CI from scratch</description>
      <author>Alice, Bob</author>
      <guid>https://prelude.scylla.dev/devlogs/new-ci-pipeline</guid>
      <pubDate>Mon, 01 Apr 2026 12:00:00 +0000</pubDate>
      <category>ci</category>
      <category>devops</category>
      <content:encoded><![CDATA[<h1>New CI Pipeline</h1><p>Full HTML content...</p>]]></content:encoded>
      <enclosure url="https://prelude.scylla.dev/images/ci-cover.jpg" length="0" type="image/jpeg" />
    </item>
  </channel>
</rss>
```

## Discord bot integration

When scraping this feed for Discord embeds, map the fields as follows:

| Discord Embed Field | RSS Source                                         |
|---------------------|----------------------------------------------------|
| **Title**           | `<title>`                                          |
| **URL**             | `<link>` or `<guid>`                               |
| **Description**     | `<description>` (includes reading time + summary)  |
| **Author**          | `<author>` (comma-separated names)                 |
| **Thumbnail/Image** | `<enclosure url="...">` (when present)             |
| **Timestamp**       | `<pubDate>` (parse RFC 2822)                       |
| **Footer/Fields**   | `<category>` elements (tags)                       |

### Deduplication

Use `<guid>` as the unique identifier for each post. It is a permalink and stable across feed refreshes.

### Polling

The feed returns the 20 most recent posts. Compare `<guid>` values against previously seen entries to detect new posts.

### Image handling

- `<enclosure>` is only present when the post has a cover image
- The URL is always absolute (relative paths are resolved server-side)
- `length` is set to `0` (actual file size is not pre-computed)
- `type` is `image/jpeg` (generic; actual format may vary)
