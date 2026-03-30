import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchPost,
  createPost,
  updatePost,
  uploadImage,
  type CreatePostRequest,
} from "@/lib/api";
import { authors } from "@/data/authors";
import { Save, Upload } from "lucide-react";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

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
  });
  const [tagInput, setTagInput] = useState("");

  const { data: existingPost } = useQuery({
    queryKey: ["admin-post", slug, editLocale],
    queryFn: () => fetchPost(slug!, editLocale),
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
      });
    }
  }, [existingPost]);

  const saveMutation = useMutation({
    mutationFn: (data: CreatePostRequest) =>
      isEditing ? updatePost(token!, slug!, data) : createPost(token!, data),
    onSuccess: () => {
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">
          {isEditing ? "Edit Post" : "New Post"}
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
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
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
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
