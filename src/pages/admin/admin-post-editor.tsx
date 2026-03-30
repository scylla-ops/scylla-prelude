import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchAdminPost,
  createPost,
  updatePost,
  uploadImage,
  type CreatePostRequest,
} from "@/lib/api";
import { authors } from "@/data/authors";
import { Save, Upload, Clock, Check } from "lucide-react";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const AUTOSAVE_KEY = "admin_draft_autosave";
const AUTOSAVE_INTERVAL = 30_000; // 30 seconds

export function AdminPostEditor() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!slug;
  const editLocale = searchParams.get("locale") || "en";

  const [form, setForm] = useState<CreatePostRequest>({
    slug: "",
    locale: "en",
    title: "",
    summary: "",
    content: "",
    tags: [],
    image: null,
    authors: [],
    status: "draft",
    published_at: null,
  });
  const [tagInput, setTagInput] = useState("");
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "idle" | "saving" | "saved"
  >("idle");
  const formRef = useRef(form);
  formRef.current = form;

  // Load from existing post when editing
  const { data: existingPost } = useQuery({
    queryKey: ["admin-post", slug, editLocale],
    queryFn: () => fetchAdminPost(token!, slug!, editLocale),
    enabled: isEditing && !!token,
  });

  useEffect(() => {
    if (existingPost) {
      setForm({
        slug: existingPost.slug,
        locale: existingPost.locale,
        title: existingPost.title,
        summary: existingPost.summary,
        content: existingPost.content,
        tags: existingPost.tags,
        image: existingPost.image,
        authors: existingPost.authors,
        status: existingPost.status,
        published_at: existingPost.published_at,
      });
      return;
    }

    // For new posts, try to restore auto-saved draft
    if (!isEditing) {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as CreatePostRequest;
          setForm(parsed);
          setAutoSaveStatus("saved");
        } catch {
          // ignore corrupted data
        }
      }
    }
  }, [existingPost, isEditing]);

  // Auto-save to localStorage every 30s for new posts
  useEffect(() => {
    if (isEditing) return;

    const interval = setInterval(() => {
      const current = formRef.current;
      // Only save if there's actual content
      if (current.title || current.content) {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(current));
        setAutoSaveStatus("saving");
        setTimeout(() => setAutoSaveStatus("saved"), 500);
      }
    }, AUTOSAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [isEditing]);

  const saveMutation = useMutation({
    mutationFn: (data: CreatePostRequest) =>
      isEditing ? updatePost(token!, slug!, data) : createPost(token!, data),
    onSuccess: () => {
      // Clear auto-save on successful save
      if (!isEditing) {
        localStorage.removeItem(AUTOSAVE_KEY);
      }
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      navigate("/admin");
    },
  });

  const handleSave = () => saveMutation.mutate(form);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    const result = await uploadImage(token, file);
    setForm((f) => ({ ...f, image: result.url }));
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      setForm((f) => ({ ...f, tags: [...f.tags, tag] }));
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  };

  const toggleAuthor = (id: string) => {
    setForm((f) => ({
      ...f,
      authors: f.authors.includes(id)
        ? f.authors.filter((a) => a !== id)
        : [...f.authors, id],
    }));
  };

  const handleStatusChange = useCallback(
    (status: string) => {
      if (status === "scheduled" && !form.published_at) {
        // Default to tomorrow at 9:00
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        setForm((f) => ({
          ...f,
          status,
          published_at: tomorrow.toISOString(),
        }));
      } else if (status !== "scheduled") {
        setForm((f) => ({ ...f, status, published_at: null }));
      } else {
        setForm((f) => ({ ...f, status }));
      }
    },
    [form.published_at],
  );

  // Word count & estimated reading time (client-side preview)
  const wordCount = form.content.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium">
            {isEditing ? "Edit Post" : "New Post"}
          </h2>
          {autoSaveStatus === "saved" && !isEditing && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Check size={12} />
              Auto-saved
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={12} />
            {wordCount} words · {readingTime} min
          </span>
          <select
            value={form.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
          </select>
          {form.status === "scheduled" && (
            <Input
              type="datetime-local"
              value={
                form.published_at
                  ? new Date(form.published_at).toISOString().slice(0, 16)
                  : ""
              }
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  published_at: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                }))
              }
              className="w-52"
            />
          )}
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save size={16} />
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          {/* Locale */}
          <div className="flex gap-2">
            {["en", "fr"].map((loc) => (
              <Button
                key={loc}
                variant={form.locale === loc ? "default" : "outline"}
                size="sm"
                onClick={() => setForm((f) => ({ ...f, locale: loc }))}
              >
                {loc.toUpperCase()}
              </Button>
            ))}
          </div>

          {/* Title */}
          <Input
            placeholder="Title"
            value={form.title}
            onChange={(e) => {
              const title = e.target.value;
              setForm((f) => ({
                ...f,
                title,
                slug: isEditing ? f.slug : slugify(title),
              }));
            }}
          />

          {/* Slug */}
          <Input
            placeholder="slug"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            disabled={isEditing}
            className="font-mono text-xs"
          />

          {/* Summary */}
          <textarea
            placeholder="Summary"
            value={form.summary}
            onChange={(e) =>
              setForm((f) => ({ ...f, summary: e.target.value }))
            }
            rows={3}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />

          {/* Tags */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                placeholder="Add tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addTag())
                }
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={addTag}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {form.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => removeTag(tag)}
                >
                  {tag} x
                </Badge>
              ))}
            </div>
          </div>

          {/* Image */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Image URL"
              value={form.image || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, image: e.target.value || null }))
              }
              className="flex-1"
            />
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload size={14} />
                  Upload
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>
          </div>

          {/* Authors */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(authors).map(([id, author]) => (
              <Button
                key={id}
                variant={form.authors.includes(id) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleAuthor(id)}
              >
                {author.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Markdown Editor */}
      <div data-color-mode="auto">
        <MDEditor
          value={form.content}
          onChange={(val) => setForm((f) => ({ ...f, content: val || "" }))}
          height={500}
        />
      </div>
    </div>
  );
}
