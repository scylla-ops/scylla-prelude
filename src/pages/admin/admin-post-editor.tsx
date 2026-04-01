import { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue, useSyncExternalStore } from "react";
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

/** Format a Date as "YYYY-MM-DDTHH:MM" in the user's local timezone (for datetime-local input) */
function toLocalDatetimeString(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}
import {
  Save,
  Clock,
  Check,
  Loader2,
  ArrowLeft,
  X,
  Eye,
  Tag,
  ChevronDown,
} from "lucide-react";
import { ImageGallery } from "./image-gallery";
import { CoverImageSection } from "./cover-image-section";
import { CardPreview, EditorSkeleton } from "./card-preview";
import { MarkdownRenderer } from "@/components/markdown-renderer";

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
    queryFn: () => fetchTags(),
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
      upsertTagColor(name, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  const closeColorPicker = useCallback(
    (save: boolean, overrideColor?: string) => {
      const finalColor = overrideColor ?? pendingColor;
      if (save && colorPickerTag && finalColor) {
        // Optimistic update — colorMutation.onSuccess will refetch from server
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
    queryFn: () => fetchAdminPost(slug!, editLocale),
    enabled: isEditing,
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
      isEditing ? updatePost(slug!, data) : createPost(data),
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
    if (!file) return;
    setImageUploading(true);
    try {
      const resized = await resizeImage(file);
      const result = await uploadImage(resized);
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

  const deferredContent = useDeferredValue(form.content);
  const wordCount = form.content.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const editorHeightStyle = "calc(100vh - 200px)";

  // Detect current theme for MDEditor (reads <html class="dark">)
  const colorMode = useSyncExternalStore(
    (cb) => {
      const observer = new MutationObserver(cb);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    },
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    () => "light",
  );

  // Scroll sync between editor and preview
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  // Attach scroll listener to MDEditor's internal scrollable element
  useEffect(() => {
    const wrapper = editorWrapperRef.current;
    if (!wrapper) return;

    // MDEditor's scrollable textarea area
    const editorScroll = wrapper.querySelector<HTMLElement>(".w-md-editor-text-input");
    const preview = previewScrollRef.current;
    if (!editorScroll || !preview) return;

    const syncFrom = (from: HTMLElement, to: HTMLElement) => {
      if (isSyncing.current) return;
      isSyncing.current = true;
      const maxFrom = from.scrollHeight - from.clientHeight;
      const maxTo = to.scrollHeight - to.clientHeight;
      if (maxFrom > 0 && maxTo > 0) {
        to.scrollTop = (from.scrollTop / maxFrom) * maxTo;
      }
      requestAnimationFrame(() => { isSyncing.current = false; });
    };

    const onEditorScroll = () => syncFrom(editorScroll, preview);
    const onPreviewScroll = () => syncFrom(preview, editorScroll);

    editorScroll.addEventListener("scroll", onEditorScroll);
    preview.addEventListener("scroll", onPreviewScroll);
    return () => {
      editorScroll.removeEventListener("scroll", onEditorScroll);
      preview.removeEventListener("scroll", onPreviewScroll);
    };
  }, []);

  return (
    <div className="flex flex-col gap-8 -mx-6 px-6 max-w-none w-[calc(100%+3rem)] lg:w-[calc(100vw-4rem)] lg:-mx-[calc((100vw-4rem-48rem)/2)]">
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
                  ? toLocalDatetimeString(new Date(form.published_at))
                  : ""
              }
              onChange={(e) => {
                const val = e.target.value;
                setForm((f) => ({
                  ...f,
                  published_at: val ? new Date(val).toISOString() : null,
                }));
              }}
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr_1fr]">
        {/* Left sidebar — metadata */}
        <div className="flex flex-col gap-4 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:pr-2">
          {/* Locale */}
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Locale</Label>
            <div className="flex gap-1.5">
              {["en", "fr"].map((loc) => (
                <Button
                  key={loc}
                  variant={form.locale === loc ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-3 text-xs"
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
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Title</Label>
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
              className="h-8 text-sm"
            />
          </div>

          {/* Slug */}
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Slug</Label>
            <Input
              placeholder="post-slug"
              value={form.slug}
              onChange={(e) =>
                setForm((f) => ({ ...f, slug: e.target.value }))
              }
              disabled={isEditing}
              className="h-8 font-mono text-xs"
            />
            {!form.slug.trim() && form.title && (
              <p className="text-[10px] text-destructive">
                Slug is required to save
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Summary</Label>
            <textarea
              placeholder="Brief description"
              value={form.summary}
              onChange={(e) =>
                setForm((f) => ({ ...f, summary: e.target.value }))
              }
              rows={2}
              className="rounded-md border border-input bg-input/20 px-2.5 py-1.5 text-xs leading-relaxed transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none dark:bg-input/30"
            />
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Tags</Label>
            <div className="flex gap-1.5">
              <Input
                placeholder="Add tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addTag())
                }
                className="h-7 flex-1 text-xs"
              />
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => addTag()}>
                Add
              </Button>
            </div>
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
                      {isPickerOpen && (
                        <>
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
            {isLoadingTags ? (
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-4 animate-pulse rounded-full bg-muted"
                    style={{ width: `${40 + i * 10}px` }}
                  />
                ))}
              </div>
            ) : tagSuggestions.length > 0 ? (
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                  <Tag size={8} />
                  Suggestions
                </span>
                <div className="flex flex-wrap gap-1">
                  {tagSuggestions.slice(0, 8).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer gap-0.5 border-dashed px-1.5 py-0 text-[10px] text-muted-foreground transition-all hover:border-solid hover:bg-primary/10 hover:text-foreground"
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
          <CoverImageSection
            image={form.image}
            imagePosition={form.image_position}
            imageError={imageError}
            imageUploading={imageUploading}
            onOpenGallery={() => setGalleryOpen(true)}
            onImageUpload={handleImageUpload}
            onImageUrlChange={(url) => {
              setForm((f) => ({ ...f, image: url }));
              setImageError(false);
            }}
            onPositionChange={(pos) => setForm((f) => ({ ...f, image_position: pos }))}
            onClear={() => {
              setForm((f) => ({ ...f, image: null, image_position: null }));
              setImageError(false);
            }}
          />

          {/* Authors */}
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Authors</Label>
            <div className="flex flex-wrap gap-1">
              {Object.entries(authors).map(([id, author]) => (
                <Button
                  key={id}
                  variant={form.authors.includes(id) ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => toggleAuthor(id)}
                >
                  {author.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Card Preview */}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setShowPreview((p) => !p)}
              className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-foreground"
            >
              <Eye size={10} />
              Card preview
              <ChevronDown
                size={10}
                className={`transition-transform ${showPreview ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence>
              {showPreview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <CardPreview form={form} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Content editor */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Content</Label>
          <div
            ref={editorWrapperRef}
            data-color-mode={colorMode}
            style={{ height: editorHeightStyle }}
          >
            <MDEditor
              value={form.content}
              onChange={(val) =>
                setForm((f) => ({ ...f, content: val || "" }))
              }
              height="100%"
              preview="edit"
            />
          </div>
        </div>

        {/* Content preview */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
            Preview
          </Label>
          <div
            ref={previewScrollRef}
            className="rounded-lg border p-6 overflow-y-auto"
            style={{ height: editorHeightStyle }}
          >
            {form.content ? (
              <MarkdownRenderer content={deferredContent} />
            ) : (
              <p className="text-sm text-muted-foreground/50 italic">
                Start writing to see the preview...
              </p>
            )}
          </div>
        </div>
      </div>
      </motion.div>
      )}
      </AnimatePresence>

      {/* Image Gallery Modal */}
      <ImageGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelect={(url) => {
          setForm((f) => ({ ...f, image: url }));
          setImageError(false);
        }}
      />
    </div>
  );
}
