import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogMedia,
} from "@/components/ui/alert-dialog";
import {
  fetchAdminPosts,
  deletePost,
  patchPostStatus,
  formatDate,
  type PostSummary,
} from "@/lib/api";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Clock,
  FileText,
  AlertTriangle,
  ImageOff,
  CalendarClock,
  Eye,
  NotebookPen,
} from "lucide-react";

type StatusFilter = "all" | "published" | "draft" | "scheduled";

const STATUS_TABS: { key: StatusFilter; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All", icon: <FileText size={13} /> },
  { key: "published", label: "Published", icon: <Eye size={13} /> },
  { key: "draft", label: "Drafts", icon: <NotebookPen size={13} /> },
  { key: "scheduled", label: "Scheduled", icon: <CalendarClock size={13} /> },
];

function statusDot(status: string) {
  switch (status) {
    case "published":
      return "bg-emerald-500";
    case "scheduled":
      return "bg-amber-500";
    default:
      return "bg-muted-foreground/40";
  }
}


const NEXT_STATUS: Record<string, string> = {
  draft: "published",
  published: "draft",
  scheduled: "published",
};

function StatusToggle({
  post,
  onToggle,
}: {
  post: PostSummary;
  onToggle: (newStatus: string) => void;
}) {
  const next = NEXT_STATUS[post.status] ?? "draft";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(next);
      }}
      title={`Switch to ${next}`}
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors hover:ring-1 hover:ring-foreground/10 ${
        post.status === "published"
          ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
          : post.status === "scheduled"
            ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      <span className={`inline-block size-1.5 rounded-full ${statusDot(post.status)}`} />
      <span className="capitalize">{post.status}</span>
    </button>
  );
}

function PostRow({
  post,
  index,
  onDelete,
  onStatusChange,
}: {
  post: PostSummary;
  index: number;
  onDelete: () => void;
  onStatusChange: (newStatus: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
    >
      <Link
        to={`/admin/posts/${encodeURIComponent(post.slug)}/edit?locale=${post.locale}`}
        className="group flex items-center gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-muted/50"
      >
        {/* Thumbnail */}
        <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/5">
          {post.image ? (
            <img
              src={post.image}
              alt=""
              className="size-full object-cover"
              style={post.image_position ? { objectPosition: post.image_position } : undefined}
              loading="lazy"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <ImageOff size={14} className="text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Main info */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium leading-snug">
              {post.title || (
                <span className="italic text-muted-foreground">(untitled)</span>
              )}
            </span>
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {post.locale.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {/* Status */}
            <StatusToggle post={post} onToggle={onStatusChange} />
            <span className="text-border">·</span>
            {/* Date */}
            <span>{formatDate(post.created_at)}</span>
            {/* Scheduled date */}
            {post.status === "scheduled" && post.published_at && (
              <>
                <span className="text-border">·</span>
                <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                  <Clock size={10} />
                  {formatDate(post.published_at)}
                </span>
              </>
            )}
            {/* Reading time */}
            {post.reading_time > 0 && (
              <>
                <span className="text-border">·</span>
                <span>{post.reading_time} min</span>
              </>
            )}
          </div>
          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {post.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-foreground/5 px-1.5 py-px text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {post.tags.length > 5 && (
                <span className="text-[10px] text-muted-foreground/50">
                  +{post.tags.length - 5}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Pencil size={14} />
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </Link>
    </motion.div>
  );
}

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<{
    slug: string;
    locale: string;
    title: string;
  } | null>(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: () => fetchAdminPosts(),
  });

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    if (statusFilter === "all") return posts;
    return posts.filter((p) => p.status === statusFilter);
  }, [posts, statusFilter]);

  const counts = useMemo(() => {
    if (!posts) return { all: 0, published: 0, draft: 0, scheduled: 0 };
    return {
      all: posts.length,
      published: posts.filter((p) => p.status === "published").length,
      draft: posts.filter((p) => p.status === "draft").length,
      scheduled: posts.filter((p) => p.status === "scheduled").length,
    };
  }, [posts]);

  const statusMutation = useMutation({
    mutationFn: ({ slug, locale, status, published_at }: { slug: string; locale: string; status: string; published_at?: string | null }) =>
      patchPostStatus(slug, locale, status, published_at),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success(`Post switched to ${variables.status}`);
    },
    onError: (error) => {
      toast.error(`Status update failed: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ slug, locale }: { slug: string; locale: string }) =>
      deletePost(slug, locale),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      setDeleteTarget(null);
    },
  });

  return (
    <AnimatePresence mode="wait">
    {isLoading ? (
      <motion.div
        key="dashboard-skeleton"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col gap-6"
      >
        <div className="flex items-center justify-between">
          <div className="h-6 w-20 animate-pulse rounded bg-muted" />
          <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="flex flex-col gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-18 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </motion.div>
    ) : (
    <motion.div
      key="dashboard-content"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium">Posts</h2>
          <span className="text-xs text-muted-foreground/60">
            {counts.all} total
          </span>
        </div>
        <Button asChild size="sm">
          <Link to="/admin/posts/new">
            <Plus size={14} />
            New Post
          </Link>
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.key;
          const count = counts[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
              {count > 0 && (
                <span
                  className={`ml-0.5 text-[10px] ${
                    isActive ? "text-foreground/60" : "text-muted-foreground/50"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Post list */}
      {posts?.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <FileText size={20} className="text-muted-foreground/40" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">No posts yet</p>
            <p className="text-xs text-muted-foreground">
              Create your first post to get started
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/admin/posts/new">
              <Plus size={14} />
              New Post
            </Link>
          </Button>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No {statusFilter} posts
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-foreground/5">
          <AnimatePresence mode="popLayout">
            {filteredPosts.map((post, i) => (
              <PostRow
                key={`${post.slug}-${post.locale}`}
                post={post}
                index={i}
                onDelete={() =>
                  setDeleteTarget({
                    slug: post.slug,
                    locale: post.locale,
                    title: post.title,
                  })
                }
                onStatusChange={(newStatus) =>
                  statusMutation.mutate({
                    slug: post.slug,
                    locale: post.locale,
                    status: newStatus,
                    published_at: post.published_at,
                  })
                }
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <AlertTriangle className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteTarget?.title}&rdquo;.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
    )}
    </AnimatePresence>
  );
}
