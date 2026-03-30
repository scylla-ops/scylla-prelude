import { Button } from "@/components/ui/button";
import { ArrowRight, ImageOff } from "lucide-react";
import { formatDate, type CreatePostRequest } from "@/lib/api";

export function CardPreview({ form }: { form: CreatePostRequest }) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-card">
      {form.image ? (
        <img
          src={form.image}
          alt="Preview"
          className="aspect-video w-full object-cover"
          style={{ objectPosition: form.image_position || "50% 50%" }}
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
          <ImageOff size={24} className="text-muted-foreground/40" />
        </div>
      )}
      <div className="px-4 pt-4 pb-2">
        <p className="text-sm font-medium line-clamp-2">
          {form.title || "Untitled post"}
        </p>
      </div>
      <div className="flex items-center gap-2 px-4 pb-4">
        <p className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">
            {formatDate(new Date().toISOString(), form.locale)}
          </span>
          <span className="shrink-0 text-border">·</span>
          <span className="shrink-0">
            {Math.max(1, Math.ceil(form.content.split(/\s+/).filter(Boolean).length / 200))} min
          </span>
        </p>
        <Button variant="outline" size="sm" className="pointer-events-none shrink-0" tabIndex={-1}>
          Read
          <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

export function EditorSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      {/* Left panel skeleton */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-10" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-8 w-12" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-8" />
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-14" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="aspect-video w-full rounded-lg" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-14" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
      {/* Right panel skeleton */}
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    </div>
  );
}
