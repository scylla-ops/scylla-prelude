export interface Post {
  slug: string;
  locale: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  image: string | null;
  authors: string[];
  reading_time: number;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PostSummary = Omit<Post, "content" | "updated_at">;

export interface CreatePostRequest {
  slug: string;
  locale: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  image: string | null;
  authors: string[];
  status: string;
  published_at: string | null;
}

const API_BASE = "/api/v1";

export async function fetchPosts(
  locale: string,
  tag?: string | null,
): Promise<PostSummary[]> {
  const params = new URLSearchParams({ locale });
  if (tag) params.set("tag", tag);
  const res = await fetch(`${API_BASE}/posts?${params}`);
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
}

export async function fetchPost(
  slug: string,
  locale: string,
): Promise<Post> {
  const params = new URLSearchParams({ locale });
  const res = await fetch(`${API_BASE}/posts/${slug}?${params}`);
  if (!res.ok) throw new Error("Post not found");
  return res.json();
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export async function fetchAdminPost(
  token: string,
  slug: string,
  locale: string,
): Promise<Post> {
  const params = new URLSearchParams({ locale });
  const res = await fetch(`${API_BASE}/admin/posts/${slug}?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Post not found");
  return res.json();
}

export async function fetchAdminPosts(token: string): Promise<PostSummary[]> {
  const res = await fetch(`${API_BASE}/admin/posts`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch admin posts");
  return res.json();
}

export async function createPost(
  token: string,
  data: CreatePostRequest,
): Promise<Post> {
  const res = await fetch(`${API_BASE}/admin/posts`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create post");
  return res.json();
}

export async function updatePost(
  token: string,
  slug: string,
  data: CreatePostRequest,
): Promise<Post> {
  const res = await fetch(`${API_BASE}/admin/posts/${slug}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update post");
  return res.json();
}

export async function deletePost(
  token: string,
  slug: string,
  locale: string,
): Promise<void> {
  const params = new URLSearchParams({ locale });
  const res = await fetch(`${API_BASE}/admin/posts/${slug}?${params}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete post");
}

export async function uploadImage(
  token: string,
  file: File,
): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/admin/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error("Failed to upload image");
  return res.json();
}

export function formatDate(date: string, locale: string = "en"): string {
  const localeMap: Record<string, string> = { en: "en-US", fr: "fr-FR" };
  return new Date(date).toLocaleDateString(localeMap[locale] ?? "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
