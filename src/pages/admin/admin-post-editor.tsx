import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useParams, useSearchParams, useNavigate, Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchAdminPost,
  createPost,
  updatePost,
  uploadImage,
  resizeImage,
  fetchTags,
  fetchPublicTags,
  upsertTagColor,
  type CreatePostRequest,
} from "@/lib/api";
import { authors } from "@/data/authors";
import {
  Save,
  Upload,
  Clock,
  Check,
  Loader2,
  ArrowLeft,
  X,
  ImageOff,
  Images,
  Eye,
  Tag,
} from "lucide-react";
import { ImageGallery } from "./image-gallery";
import { ImagePositioner } from "./image-positioner";
import { CardPreview, EditorSkeleton } from "./card-preview";

import { slugifyUrl } from "@/lib/utils";

const AUTOSAVE_KEY = "admin_draft_autosave";
const AUTOSAVE_INTERVAL = 30_000;
const TAG_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#6b7280",
];

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
    image_position: null,
    authors: [],
    status: "draft",
    published_at: null,
  });
  const [tagInput, setTagInput] = useState("");
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "idle" | "saving" | "saved"
  >("idle");
  const [imageError, setImageError] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const formRef = useRef(form);
  formRef.current = form;

  // Fetch existing tags for suggestions
  const { data: existingTags = [], isLoading: isLoadingTags } = useQuery({
    queryKey: ["admin-tags"],
    queryFn: () => fetchTags(token!),
    enabled: !!token,
    staleTime: 0,
  });

  // Fetch tag colors
  const { data: tagColors = [] } = useQuery({
    queryKey: ["tags", form.locale],
    queryFn: () => fetchPublicTags(form.locale),
  });
  const tagColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tagColors) map.set(t.name, t.color);
    return map;
  }, [tagColors]);

  const [colorPickerTag, setColorPickerTag] = useState<string | null>(null);
  const [pendingColor, setPendingColor] = useState<string>("#6b7280");

  const colorMutation = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      upsertTagColor(token!, name, color),
  });

  const closeColorPicker = useCallback(
    (save: boolean, overrideColor?: string) => {
      const finalColor = overrideColor ?? pendingColor;
      if (save && colorPickerTag && finalColor) {
        // Optimistic update — no invalidation here, saveMutation.onSuccess handles it
        queryClient.setQueryData<import("@/lib/api").TagInfo[]>(
          ["tags", form.locale],
          (old) => {
            const list = old ?? [];
            const exists = list.some((t) => t.name === colorPickerTag);
            if (exists) {
              return list.map((t) =>
                t.name === colorPickerTag ? { ...t, color: finalColor } : t,
              );
            }
            return [...list, { name: colorPickerTag, color: finalColor }];
          },
        );
        colorMutation.mutate({ name: colorPickerTag, color: finalColor });
      }
      setColorPickerTag(null);
    },
    [colorPickerTag, pendingColor, colorMutation, queryClient, form.locale],
  );

  // Filter tag suggestions: tags not already added, matching input
  const tagSuggestions = useMemo(() => {
    if (!tagInput.trim()) return existingTags.filter((t) => !form.tags.includes(t));
    const q = tagInput.toLowerCase();
    return existingTags.filter(
      (t) => !form.tags.includes(t) && t.toLowerCase().includes(q),
    );
  }, [tagInput, existingTags, form.tags]);

  // Load from existing post when editing
  const { data: existingPost, isLoading: isLoadingPost } = useQuery({
    queryKey: ["admin-post", slug, editLocale],
    queryFn: () => fetchAdminPost(token!, slug!, editLocale),
    enabled: isEditing && !!token,
    retry: false,
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
        image_position: existingPost.image_position,
        authors: existingPost.authors,
        status: existingPost.status,
        published_at: existingPost.published_at,
      });
      return;
    }

    if (!isEditing) {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as CreatePostRequest;
          setForm(parsed);
          setAutoSaveStatus("saved");
        } catch {
          // ignore
        }
      }
    }
  }, [existingPost, isEditing]);

  // Auto-save every 30s for new posts
  useEffect(() => {
    if (isEditing) return;
    const interval = setInterval(() => {
      const current = formRef.current;
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
    onSuccess: async () => {
      if (!isEditing) localStorage.removeItem(AUTOSAVE_KEY);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-posts"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-post"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-tags"] }),
        queryClient.invalidateQueries({ queryKey: ["tags"] }),
        queryClient.invalidateQueries({ queryKey: ["posts"] }),
        queryClient.invalidateQueries({ queryKey: ["post"] }),
      ]);
      navigate("/admin");
    },
    onError: (error) => {
      toast.error(`Save failed: ${error.message}`);
    },
  });

  const handleSave = () => saveMutation.mutate(formRef.current);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setImageUploading(true);
    try {
      const resized = await resizeImage(file);
      const result = await uploadImage(token, resized);
      setForm((f) => ({ ...f, image: result.url }));
      setImageError(false);
      queryClient.invalidateQueries({ queryKey: ["admin-media"] });
    } catch {
      toast.error("Upload failed");
    } finally {
      setImageUploading(false);
    }
  };

  const addTag = (tag?: string) => {
    const t = (tag ?? tagInput).trim();
    if (t && !form.tags.includes(t)) {
      setForm((f) => ({ ...f, tags: [...f.tags, t] }));
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
      if (status === "published") {
        setForm((f) => ({
          ...f,
          status,
          published_at: f.published_at ?? new Date().toISOString(),
        }));
      } else if (status === "scheduled" && !form.published_at) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        setForm((f) => ({ ...f, status, published_at: tomorrow.toISOString() }));
      } else if (status === "draft") {
        setForm((f) => ({ ...f, status, published_at: null }));
      } else {
        setForm((f) => ({ ...f, status }));
      }
    },
    [form.published_at],
  );

  const wordCount = form.content.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="flex flex-col gap-8">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin">
              <ArrowLeft size={14} />
              Back
            </Link>
          </Button>
          <h2 className="text-lg font-medium">
            {isEditing ? "Edit Post" : "New Post"}
          </h2>
          <AnimatePresence>
            {autoSaveStatus !== "idle" && !isEditing && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-xs text-muted-foreground"
              >
                {autoSaveStatus === "saving" ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={12} className="text-emerald-500" />
                    Draft saved
                  </>
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <Clock size={12} />
            {wordCount} words · {readingTime} min
          </span>
          <Select value={form.status} onValueChange={handleStatusChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
            </SelectContent>
          </Select>
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
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !form.slug.trim()}
            className="transition-all"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main layout */}
      <AnimatePresence mode="wait">
      {isEditing && isLoadingPost ? (
        <motion.div
          key="editor-skeleton"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <EditorSkeleton />
        </motion.div>
      ) : (
      <motion.div
        key="editor-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">
        {/* Left panel — metadata */}
        <div className="flex flex-col gap-6">
          {/* Locale */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Locale</Label>
            <div className="flex gap-2">
              {["en", "fr"].map((loc) => (
                <Button
                  key={loc}
                  variant={form.locale === loc ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    !isEditing && setForm((f) => ({ ...f, locale: loc }))
                  }
                  disabled={isEditing}
                >
                  {loc.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input
              placeholder="Post title"
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                setForm((f) => ({
                  ...f,
                  title,
                  slug: isEditing ? f.slug : slugifyUrl(title),
                }));
              }}
            />
          </div>

          {/* Slug */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Slug</Label>
            <Input
              placeholder="post-slug"
              value={form.slug}
              onChange={(e) =>
                setForm((f) => ({ ...f, slug: e.target.value }))
              }
              disabled={isEditing}
              className="font-mono text-xs"
            />
            {!form.slug.trim() && form.title && (
              <p className="text-xs text-destructive">
                Slug is required to save
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Summary</Label>
            <textarea
              placeholder="Brief description of the post"
              value={form.summary}
              onChange={(e) =>
                setForm((f) => ({ ...f, summary: e.target.value }))
              }
              rows={3}
              className="rounded-md border border-input bg-input/20 px-3 py-2 text-sm transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none dark:bg-input/30"
            />
          </div>

          {/* Tags with suggestions */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Tags</Label>
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
              <Button variant="outline" size="sm" onClick={() => addTag()}>
                Add
              </Button>
            </div>
            {/* Current tags with color picker */}
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.tags.map((tag) => {
                  const color = tagColorMap.get(tag) ?? "#6b7280";
                  const isPickerOpen = colorPickerTag === tag;
                  return (
                    <div key={tag} className="relative">
                      <div
                        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: color + "15",
                          color,
                          boxShadow: `inset 0 0 0 1px ${color}30`,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (isPickerOpen) {
                              closeColorPicker(false);
                            } else {
                              setPendingColor(color);
                              setColorPickerTag(tag);
                            }
                          }}
                          className="size-2.5 shrink-0 rounded-full transition-transform hover:scale-125"
                          style={{ backgroundColor: color }}
                          title="Change color"
                        />
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="rounded-full p-0.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                        >
                          <X size={10} />
                        </button>
                      </div>
                      {/* Color picker popover */}
                      {isPickerOpen && (
                        <>
                          {/* Click-outside backdrop — saves + closes */}
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => closeColorPicker(true)}
                          />
                          <div className="absolute top-full left-0 z-20 mt-1.5 flex flex-col gap-2.5 rounded-lg bg-card p-2.5 ring-1 ring-foreground/10 shadow-xl">
                            <div className="flex flex-wrap gap-1.5" style={{ width: "130px" }}>
                              {TAG_COLORS.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => closeColorPicker(true, c)}
                                  className="size-5 rounded-full ring-1 ring-foreground/10 transition-transform hover:scale-110"
                                  style={{
                                    backgroundColor: c,
                                    outline: c === pendingColor ? "2px solid var(--color-foreground)" : "none",
                                    outlineOffset: "1px",
                                  }}
                                />
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={pendingColor}
                                onChange={(e) => setPendingColor(e.target.value)}
                                className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                              />
                              <span className="font-mono text-[10px] text-muted-foreground">{pendingColor}</span>
                              <button
                                type="button"
                                onClick={() => closeColorPicker(true)}
                                className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                OK
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {/* Tag suggestions */}
            {isLoadingTags ? (
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-5 animate-pulse rounded-full bg-muted"
                    style={{ width: `${48 + i * 12}px` }}
                  />
                ))}
              </div>
            ) : tagSuggestions.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                  <Tag size={10} />
                  Suggestions
                </span>
                <div className="flex flex-wrap gap-1">
                  {tagSuggestions.slice(0, 12).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer gap-1 border-dashed text-muted-foreground transition-all hover:border-solid hover:bg-primary/10 hover:text-foreground"
                      onClick={() => addTag(tag)}
                    >
                      + {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Cover Image */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Cover image
            </Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGalleryOpen(true)}
                className="flex-1"
              >
                <Images size={14} />
                Gallery
              </Button>
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
            <Input
              placeholder="Or paste image URL"
              value={form.image || ""}
              onChange={(e) => {
                setForm((f) => ({ ...f, image: e.target.value || null }));
                setImageError(false);
              }}
              className="text-xs"
            />
            {imageUploading && (
              <div className="relative overflow-hidden rounded-lg ring-1 ring-foreground/10">
                <div className="flex aspect-video w-full items-center justify-center bg-muted">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-xs">Uploading...</span>
                  </div>
                </div>
              </div>
            )}
            {!imageUploading && form.image && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex flex-col gap-2"
              >
                {!imageError ? (
                  <div className="relative">
                    <ImagePositioner
                      src={form.image}
                      position={form.image_position || "50% 50%"}
                      onPositionChange={(pos) =>
                        setForm((f) => ({ ...f, image_position: pos }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, image: null, image_position: null }));
                        setImageError(false);
                      }}
                      className="absolute top-8 right-2 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-lg ring-1 ring-foreground/10">
                    <div className="flex aspect-video w-full items-center justify-center bg-muted">
                      <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
                        <ImageOff size={20} />
                        <span className="text-xs">Failed to load</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, image: null, image_position: null }));
                        setImageError(false);
                      }}
                      className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Authors */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Authors</Label>
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

          {/* Card Preview (collapsible on mobile) */}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => setShowPreview((p) => !p)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            >
              <Eye size={12} />
              {showPreview ? "Hide" : "Show"} card preview
            </button>
            <AnimatePresence>
              {showPreview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden lg:hidden"
                >
                  <CardPreview form={form} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right panel — Editor + desktop preview */}
        <div className="flex flex-col gap-6">
          {/* Content editor */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Content</Label>
            <div data-color-mode="auto">
              <MDEditor
                value={form.content}
                onChange={(val) =>
                  setForm((f) => ({ ...f, content: val || "" }))
                }
                height={600}
              />
            </div>
          </div>

          {/* Desktop card preview — always visible */}
          <div className="hidden flex-col gap-2 lg:flex">
            <Label className="text-xs text-muted-foreground">
              Card preview
            </Label>
            <div className="max-w-sm">
              <CardPreview form={form} />
            </div>
          </div>
        </div>
      </div>
      </motion.div>
      )}
      </AnimatePresence>

      {/* Image Gallery Modal */}
      {token && (
        <ImageGallery
          open={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          onSelect={(url) => {
            setForm((f) => ({ ...f, image: url }));
            setImageError(false);
          }}
          token={token}
        />
      )}
    </div>
  );
}
