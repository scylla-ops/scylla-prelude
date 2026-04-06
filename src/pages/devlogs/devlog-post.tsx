import { useMemo } from "react";
import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
} from "@/components/ui/avatar";
import { ArrowLeft, Clock } from "lucide-react";
import { fetchPost, fetchPublicTags, formatDate } from "@/lib/api";
import { getAuthor } from "@/data/authors";
import { useLocale } from "@/i18n/use-locale";
import { TableOfContents, MobileToc } from "@/components/toc";
import { MarkdownRenderer } from "@/components/markdown-renderer";

export function DevlogPost() {
  const { t, locale } = useLocale();
  const { slug } = useParams<{ slug: string }>();

  const { data: devlog, isLoading, isError } = useQuery({
    queryKey: ["post", slug, locale],
    queryFn: () => fetchPost(slug!, locale),
    enabled: !!slug,
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["tags", locale],
    queryFn: () => fetchPublicTags(locale),
  });

  const tagColorMap = useMemo(() => new Map(tags.map((t) => [t.name, t.color])), [tags]);

  return (
    <AnimatePresence mode="wait">
    {isLoading ? (
      <motion.article
        key="skeleton"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="mx-auto flex flex-col gap-6"
      >
        <div className="flex flex-col gap-6">
          <div className="h-10 w-28 animate-pulse rounded-md bg-muted" />
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-8 w-3/4 animate-pulse rounded-md bg-muted" />
              <div className="h-8 w-1/2 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="flex -space-x-2">
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
            <div className="h-5 w-18 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-4">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-6 w-48 animate-pulse rounded bg-muted mt-2" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-10/12 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      </motion.article>
    ) : isError ? (
      <motion.div
        key="error"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-6 items-center justify-center"
      >
        <h1 className="text-xl font-medium tracking-tight">
          {t("devlog.error.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("devlog.error.body")}
        </p>
        <Button variant="outline" size="lg" onClick={() => window.location.reload()}>
          {t("devlog.error.retry")}
        </Button>
      </motion.div>
    ) : !devlog ? (
      <motion.div
        key="not-found"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-6 items-center justify-center"
      >
        <h1 className="text-xl font-medium tracking-tight">
          {t("devlog.notFound.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("devlog.notFound.body")}
        </p>
        <Button variant="outline" size="lg" asChild>
          <Link to="/">{t("devlog.notFound.back")}</Link>
        </Button>
      </motion.div>
    ) : (
      <motion.div
        key="content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="relative"
      >
      <article className="mx-auto flex min-w-0 flex-col gap-6 overflow-hidden">
        <div className="flex flex-col gap-6">
          <Button
            variant="ghost"
            size="lg"
            asChild
            className="w-fit text-muted-foreground"
          >
            <Link to="/">
              <ArrowLeft size={16} />
              {t("devlog.back")}
            </Link>
          </Button>
          <div className="flex items-start justify-between gap-4">
            <h1 className="min-w-0 break-words text-3xl font-medium tracking-tight">
              {devlog.title}
            </h1>
            {devlog.authors.length > 0 && (
              <AvatarGroup className="shrink-0 pt-1.5">
                {devlog.authors.map((id) => {
                  const author = getAuthor(id);
                  if (!author) return null;
                  return (
                    <Avatar key={id} size="sm">
                      <AvatarImage src={author.avatar} alt={author.name} />
                      <AvatarFallback>{author.name[0]}</AvatarFallback>
                    </Avatar>
                  );
                })}
              </AvatarGroup>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {formatDate(devlog.published_at ?? devlog.created_at, locale)}
            </span>
            <span className="text-xs text-border">·</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={12} />
              {devlog.reading_time} min
            </span>
            {devlog.tags.map((tag) => {
              const color = tagColorMap.get(tag) ?? "#6b7280";
              return (
                <Link
                  key={tag}
                  to={`/?tags=${encodeURIComponent(tag)}`}
                  className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors hover:opacity-80"
                  style={{ borderColor: color + "40", color }}
                >
                  <span
                    className="inline-block size-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {tag}
                </Link>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Mobile TOC */}
        <MobileToc content={devlog.content} />

        <MarkdownRenderer content={devlog.content} />
      </article>

      {/* Desktop TOC — fixed in right gutter */}
      <aside className="hidden xl:block fixed top-24 bottom-6 w-56 overflow-y-auto overscroll-contain" style={{
        right: "max(1rem, calc((100vw - 48rem) / 2 - 16rem))",
      }}>
        <p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {t("devlog.toc.title")}
        </p>
        <TableOfContents content={devlog.content} variant="sidebar" />
      </aside>
      </motion.div>
    )}
    </AnimatePresence>
  );
}
