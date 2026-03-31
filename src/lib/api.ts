export interface Post {
  slug: string;
  locale: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  image: string | null;
  image_position: string | null;
  authors: string[];
  reading_time: number;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PostSummary = Omit<Post, "content" | "updated_at">;

export interface PaginatedResponse {
  posts: PostSummary[];
  total: number;
}

export interface CreatePostRequest {
  slug: string;
  locale: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  image: string | null;
  image_position: string | null;
  authors: string[];
  status: string;
  published_at: string | null;
}

export interface MediaItem {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
  width: number;
  height: number;
  url: string;
  created_at: string;
}

export interface AuthUser {
  username: string;
  name: string;
  avatar_url: string;
}

const API_BASE = "/api/v1";

export async function fetchPosts(
  locale: string,
  options?: {
    tags?: string[];
    search?: string | null;
    page?: number;
    limit?: number;
  },
): Promise<PaginatedResponse> {
  const params = new URLSearchParams({ locale });
  if (options?.tags && options.tags.length > 0) {
    params.set("tags", options.tags.join(","));
  }
  if (options?.search) params.set("search", options.search);
  if (options?.page != null) params.set("page", String(options.page));
  if (options?.limit != null) params.set("limit", String(options.limit));
  const res = await fetch(`${API_BASE}/posts?${params}`);
  if (!res.ok) throw new Error(await extractApiError(res, "Failed to fetch posts"));
  return res.json();
}

export interface TagInfo {
  name: string;
  color: string;
}

export async function fetchPublicTags(locale: string): Promise<TagInfo[]> {
  const params = new URLSearchParams({ locale });
  const res = await fetch(`${API_BASE}/tags?${params}`);
  if (!res.ok) throw new Error(await extractApiError(res, "Failed to fetch tags"));
  return res.json();
}

export async function upsertTagColor(
  name: string,
  color: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/tags/color`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ name, color }),
  });
  if (!res.ok) throw new Error(await extractApiError(res, "Failed to update tag color"));
}

export async function fetchPost(
  slug: string,
  locale: string,
): Promise<Post> {
  const params = new URLSearchParams({ locale });
  const res = await fetch(`${API_BASE}/posts/${slug}?${params}`);
  if (!res.ok) throw new Error(await extractApiError(res, "Post not found"));
  return res.json();
}

async function extractApiError(res: Response, fallback: string): Promise<string> {
  try {
    const text = await res.text();
    const json = JSON.parse(text);
    if (typeof json.error === "string") {
      const msg = json.error
        .replace(/^bad request:\s*/i, "")
        .replace(/^conflict:\s*/i, "");
      return msg.charAt(0).toUpperCase() + msg.slice(1);
    }
  } catch {
    // not JSON or unreadable — use fallback
  }
  return fallback;
}

export async function fetchAdminPost(
  slug: string,
  locale: string,
): Promise<Post> {
  const params = new URLSearchParams({ locale });
  const res = await fetch(`${API_BASE}/admin/posts/${slug}?${params}`, {
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(await extractApiError(res, "Post not found"));
  return res.json();
}

export async function fetchAdminPosts(): Promise<PostSummary[]> {
  const res = await fetch(`${API_BASE}/admin/posts`, {
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(await extractApiError(res, "Failed to fetch admin posts"));
  return res.json();
}

export async function createPost(
  data: CreatePostRequest,
): Promise<Post> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${API_BASE}/admin/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(await extractApiError(res, "Failed to create post"));
    }
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function updatePost(
  slug: string,
  data: CreatePostRequest,
): Promise<Post> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${API_BASE}/admin/posts/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(await extractApiError(res, "Failed to update post"));
    }
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function patchPostStatus(
  slug: string,
  locale: string,
  status: string,
  published_at?: string | null,
): Promise<Post> {
  const res = await fetch(`${API_BASE}/admin/posts/${slug}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ locale, status, published_at: published_at ?? null }),
  });
  if (!res.ok) {
    throw new Error(await extractApiError(res, "Failed to update status"));
  }
  return res.json();
}

export async function deletePost(
  slug: string,
  locale: string,
): Promise<void> {
  const params = new URLSearchParams({ locale });
  const res = await fetch(`${API_BASE}/admin/posts/${slug}?${params}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(await extractApiError(res, "Failed to delete post"));
}

// --- Media ---

export async function uploadImage(
  file: File,
): Promise<MediaItem> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/admin/upload`, {
    method: "POST",
    credentials: "same-origin",
    body: form,
  });
  if (!res.ok) throw new Error(await extractApiError(res, "Failed to upload image"));
  return res.json();
}

export async function fetchMedia(): Promise<MediaItem[]> {
  const res = await fetch(`${API_BASE}/admin/media`, {
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(await extractApiError(res, "Failed to fetch media"));
  return res.json();
}

export async function deleteMedia(
  id: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/media/${id}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(await extractApiError(res, "Failed to delete media"));
}

export async function fetchTags(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/admin/tags`, {
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(await extractApiError(res, "Failed to fetch tags"));
  return res.json();
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error("Not authenticated");
  return res.json();
}

export async function apiLogout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    credentials: "same-origin",
  });
}

// --- Utilities ---

/** Resize an image file client-side before upload (max width, maintains aspect ratio) */
export async function resizeImage(
  file: File,
  maxWidth = 1200,
  quality = 0.85,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);

      // Skip resize if already small enough
      if (img.width <= maxWidth) {
        resolve(file);
        return;
      }

      const ratio = maxWidth / img.width;
      const canvas = document.createElement("canvas");
      canvas.width = maxWidth;
      canvas.height = Math.round(img.height * ratio);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const resized = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".webp"),
            { type: "image/webp" },
          );
          resolve(resized);
        },
        "image/webp",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for resize"));
    };
    img.src = url;
  });
}

export function formatDate(date: string, locale: string = "en"): string {
  const localeMap: Record<string, string> = { en: "en-US", fr: "fr-FR" };
  return new Date(date).toLocaleDateString(localeMap[locale] ?? "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
