import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
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
import {
  TableOfContents,
  MobileToc,
  slugify,
  getTextContent,
} from "@/components/toc";

export function DevlogPost() {
  const { t, locale } = useLocale();
  const { slug } = useParams<{ slug: string }>();

  const { data: devlog, isLoading } = useQuery({
    queryKey: ["post", slug, locale],
    queryFn: () => fetchPost(slug!, locale),
    enabled: !!slug,
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["tags", locale],
    queryFn: () => fetchPublicTags(locale),
  });

  const tagColorMap = new Map(tags.map((t) => [t.name, t.color]));

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
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-medium tracking-tight">
              {devlog.title}
            </h1>
            {devlog.authors.length > 0 && (
              <AvatarGroup>
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
              {formatDate(devlog.created_at, locale)}
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

        <div className="text-sm leading-7 text-muted-foreground break-words [&>*+*]:mt-5 [&_h1]:mt-8 [&_h1]:text-xl [&_h1]:font-medium [&_h1]:tracking-tight [&_h1]:text-foreground [&_h1]:scroll-mt-20 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-medium [&_h2]:tracking-tight [&_h2]:text-foreground [&_h2]:scroll-mt-20 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-foreground [&_h3]:scroll-mt-20 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_strong]:text-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-3 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_img]:mt-4 [&_img]:rounded-xl [&_img]:ring-1 [&_img]:ring-foreground/10 [&_hr]:border-border [&_hr]:my-6">
          <Markdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeSanitize]}
            components={{
              h1: ({ children, node, ...props }) => {
                const id = slugify(getTextContent(children));
                return (
                  <h1 {...props} id={id}>
                    {children}
                  </h1>
                );
              },
              h2: ({ children, node, ...props }) => {
                const id = slugify(getTextContent(children));
                return (
                  <h2 {...props} id={id}>
                    {children}
                  </h2>
                );
              },
              h3: ({ children, node, ...props }) => {
                const id = slugify(getTextContent(children));
                return (
                  <h3 {...props} id={id}>
                    {children}
                  </h3>
                );
              },
            }}
          >
            {devlog.content}
          </Markdown>
        </div>
      </article>

      {/* Desktop TOC — fixed in right gutter */}
      <aside className="hidden xl:block fixed top-24 w-56" style={{
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
