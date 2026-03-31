import { useState, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExpandableSearch } from "@/components/ui/expandable-search";
import {
  useMorphingDialog,
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogImage,
  MorphingDialogTitle,
  MorphingDialogSubtitle,
  MorphingDialogDescription,
  MorphingDialogClose,
  MorphingDialogPlaceholder,
} from "@/components/ui/morphing-dialog";
import { ArrowRight, Filter, Check, X } from "lucide-react";
import { fetchPosts, fetchPublicTags, formatDate } from "@/lib/api";
import { useLocale } from "@/i18n/use-locale";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const easeOutSine = [0.39, 0.575, 0.565, 1] as const;
const staggerDelay = 0.12;
const POSTS_PER_PAGE = 9;

function CardExtras({ children }: { children: React.ReactNode }) {
  const { isOpen } = useMorphingDialog();
  if (isOpen) return null;
  return <>{children}</>;
}

function HighlightMatch({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="rounded-sm bg-yellow-200/60 px-0.5 dark:bg-yellow-500/30"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

function SlideIn({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: easeOutSine,
        delay: index * staggerDelay,
      }}
    >
      {children}
    </motion.div>
  );
}

function FadeIn({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.4,
        ease: easeOutSine,
        delay: index * staggerDelay,
      }}
    >
      {children}
    </motion.div>
  );
}

function PostCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-card">
      <div className="aspect-video w-full animate-pulse bg-muted" />
      <div className="px-5 pt-5 pb-3">
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex items-center gap-2 px-5 pb-5">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-14 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function LandingPage() {
  const { t, locale } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filterOpen, setFilterOpen] = useState(false);

  // Multi-tag filter from URL
  const activeTags = useMemo(() => {
    const param = searchParams.get("tags");
    if (!param) return [] as string[];
    return param.split(",").filter(Boolean);
  }, [searchParams]);

  const setActiveTags = useCallback(
    (tags: string[]) => {
      if (tags.length > 0) {
        setSearchParams({ tags: tags.join(",") });
      } else {
        setSearchParams({});
      }
    },
    [setSearchParams],
  );

  const toggleTag = useCallback(
    (name: string) => {
      setActiveTags(
        activeTags.includes(name)
          ? activeTags.filter((t) => t !== name)
          : [...activeTags, name],
      );
    },
    [activeTags, setActiveTags],
  );

  // Dynamic tags from API (now with colors)
  const { data: tags = [] } = useQuery({
    queryKey: ["tags", locale],
    queryFn: () => fetchPublicTags(locale),
  });

  // Build a color lookup for use in dialog tags
  const tagColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tags) map.set(t.name, t.color);
    return map;
  }, [tags]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["posts", locale, activeTags, debouncedSearch],
    queryFn: ({ pageParam = 0 }) =>
      fetchPosts(locale, {
        tags: activeTags.length > 0 ? activeTags : undefined,
        search: debouncedSearch || null,
        page: pageParam,
        limit: POSTS_PER_PAGE,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.posts.length, 0);
      return loaded < lastPage.total ? allPages.length : undefined;
    },
    initialPageParam: 0,
  });

  const allPosts = useMemo(
    () => data?.pages.flatMap((p) => p.posts) ?? [],
    [data],
  );
  const total = data?.pages[0]?.total ?? 0;

  return (
    <AnimatePresence mode="wait">
      <div key={locale} className="flex flex-col gap-16">
        <section className="flex flex-col gap-3">
          <SlideIn index={0}>
            <h1 className="text-xl font-medium tracking-tight">
              {t("landing.welcome.title")}
            </h1>
          </SlideIn>
          <SlideIn index={1}>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("landing.welcome.body")}
            </p>
          </SlideIn>
        </section>

        <section className="flex flex-col gap-3">
          <SlideIn index={2}>
            <h2 className="text-xl font-medium tracking-tight">
              {t("landing.scylla.title")}
            </h2>
          </SlideIn>
          <SlideIn index={3}>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("landing.scylla.body1")}
            </p>
          </SlideIn>
          <SlideIn index={4}>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("landing.scylla.body2")}{" "}
              <Link
                to="/about"
                className="text-foreground underline underline-offset-3 hover:text-muted-foreground"
              >
                {t("landing.scylla.learnMore")}
              </Link>
            </p>
          </SlideIn>
        </section>

        {/* Posts section */}
        <FadeIn index={5}>
          <section className="flex flex-col gap-5">
            {/* Header row: title + search */}
            <div className="flex items-center gap-3">
              <h3 className="shrink-0 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {t("landing.posts.title")}
              </h3>

              {/* Post count */}
              {total > 0 && (
                <span className="min-w-0 truncate text-[11px] text-muted-foreground/60">
                  {t("landing.posts.showingCount")
                    .replace("{count}", String(allPosts.length))
                    .replace("{total}", String(total))}
                </span>
              )}

              {/* Search — right side */}
              <div className="ml-auto flex items-center sm:hidden">
                <ExpandableSearch
                  value={search}
                  onChange={setSearch}
                  placeholder={t("search.placeholder")}
                />
              </div>
              <Input
                placeholder={t("search.placeholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ml-auto hidden w-44 sm:block"
              />
            </div>

            {/* Tag filter */}
            {tags.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setFilterOpen(!filterOpen)}
                    className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                  >
                    <Filter size={12} />
                    {t("filter.tags")}
                    {activeTags.length > 0 && (
                      <span className="flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] font-medium text-background">
                        {activeTags.length}
                      </span>
                    )}
                  </button>
                  {filterOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setFilterOpen(false)}
                      />
                      <div className="absolute top-full left-0 z-20 mt-1.5 w-48 rounded-lg bg-card p-1.5 ring-1 ring-foreground/10 shadow-xl">
                        {tags.map((tag) => {
                          const isActive = activeTags.includes(tag.name);
                          return (
                            <button
                              key={tag.name}
                              onClick={() => toggleTag(tag.name)}
                              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-muted"
                            >
                              <span
                                className="size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: tag.color }}
                              />
                              <span className={isActive ? "text-foreground font-medium" : "text-muted-foreground"}>
                                {tag.name}
                              </span>
                              {isActive && (
                                <Check size={12} className="ml-auto text-foreground" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
                {/* Active tag pills */}
                {activeTags.length > 0 && (
                  <>
                    {activeTags.map((name) => {
                      const color = tagColorMap.get(name) ?? "#6b7280";
                      return (
                        <button
                          key={name}
                          onClick={() => toggleTag(name)}
                          className="flex items-center gap-1 rounded-full py-0.5 pl-2 pr-1.5 text-[11px] font-medium transition-colors hover:opacity-80"
                          style={{
                            backgroundColor: color + "15",
                            color,
                            boxShadow: `inset 0 0 0 1px ${color}25`,
                          }}
                        >
                          {name}
                          <X size={10} />
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setActiveTags([])}
                      className="text-[11px] text-muted-foreground/50 transition-colors hover:text-foreground"
                    >
                      {t("filter.clearAll")}
                    </button>
                  </>
                )}
              </div>
            )}

            <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="skeletons"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 gap-5 md:grid-cols-2"
              >
                {Array.from({ length: 3 }).map((_, i) => (
                  <PostCardSkeleton key={i} />
                ))}
              </motion.div>
            ) : allPosts.length > 0 ? (
              <motion.div
                key="posts"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.05 }}
              >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {allPosts.map((devlog) => (
                    <MorphingDialog key={`${devlog.slug}-${devlog.locale}`}>
                      <div className="group isolate overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-card transition-shadow duration-200 hover:shadow-md hover:ring-foreground/20">
                        <MorphingDialogTrigger className="w-full cursor-pointer text-left">
                          {devlog.image ? (
                            <MorphingDialogImage
                              src={devlog.image}
                              alt={devlog.title}
                              className="aspect-video w-full object-cover"
                              style={devlog.image_position ? { objectPosition: devlog.image_position } : undefined}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <MorphingDialogPlaceholder className="aspect-video w-full" />
                          )}
                          <div className="px-5 pt-5 pb-2">
                            <MorphingDialogTitle>
                              <p className="text-sm font-medium leading-snug line-clamp-2 break-words">
                                <HighlightMatch
                                  text={devlog.title}
                                  query={debouncedSearch}
                                />
                              </p>
                            </MorphingDialogTitle>
                          </div>
                        </MorphingDialogTrigger>
                        <CardExtras>
                        {devlog.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 px-5 pb-2">
                            {devlog.tags.slice(0, 3).map((tagName) => {
                              const color = tagColorMap.get(tagName) ?? "#6b7280";
                              return (
                                <button
                                  key={tagName}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTag(tagName);
                                  }}
                                  className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors hover:opacity-80"
                                  style={{ borderColor: color + "40", color }}
                                >
                                  <span
                                    className="inline-block size-1.5 rounded-full"
                                    style={{ backgroundColor: color }}
                                  />
                                  {tagName}
                                </button>
                              );
                            })}
                            {devlog.tags.length > 3 && (
                              <span className="text-[10px] text-muted-foreground/50 self-center">
                                +{devlog.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-3 px-5 pb-5">
                          <MorphingDialogSubtitle className="min-w-0 flex-1">
                            <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
                              <span className="truncate">{formatDate(devlog.created_at, locale)}</span>
                              <span className="shrink-0 text-border">·</span>
                              <span className="shrink-0">{devlog.reading_time} min</span>
                            </p>
                          </MorphingDialogSubtitle>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="shrink-0 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                          >
                            <Link to={`/devlogs/${devlog.slug}`}>
                              {t("landing.posts.read")}
                              <ArrowRight size={14} />
                            </Link>
                          </Button>
                        </div>
                        </CardExtras>
                      </div>

                      <MorphingDialogContainer>
                        <MorphingDialogContent className="relative w-full max-w-md rounded-xl bg-card ring-1 ring-foreground/10">
                          {devlog.image ? (
                            <MorphingDialogImage
                              src={devlog.image}
                              alt={devlog.title}
                              className="aspect-video w-full object-cover"
                              style={devlog.image_position ? { objectPosition: devlog.image_position } : undefined}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <MorphingDialogPlaceholder className="aspect-video w-full" />
                          )}
                          <div className="p-6">
                            <MorphingDialogTitle>
                              <p className="text-base font-medium">
                                {devlog.title}
                              </p>
                            </MorphingDialogTitle>
                            <MorphingDialogSubtitle>
                              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{formatDate(devlog.created_at, locale)}</span>
                                <span className="text-border">·</span>
                                <span>{devlog.reading_time} min</span>
                              </p>
                            </MorphingDialogSubtitle>
                            <MorphingDialogDescription
                              disableLayoutAnimation
                              className="mt-4"
                            >
                              <p className="text-sm leading-relaxed text-muted-foreground">
                                <HighlightMatch
                                  text={devlog.summary}
                                  query={debouncedSearch}
                                />
                              </p>
                              {devlog.tags.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {devlog.tags.map((tagName) => {
                                    const color = tagColorMap.get(tagName) ?? "#6b7280";
                                    return (
                                      <button
                                        key={tagName}
                                        onClick={() => toggleTag(tagName)}
                                        className="flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:opacity-80"
                                        style={{
                                          borderColor: color + "40",
                                          color,
                                        }}
                                      >
                                        <span
                                          className="inline-block size-1.5 rounded-full"
                                          style={{ backgroundColor: color }}
                                        />
                                        {tagName}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              <Button className="mt-4 w-full" size="lg" asChild>
                                <Link to={`/devlogs/${devlog.slug}`}>
                                  {t("landing.posts.readMore")}
                                  <ArrowRight size={16} />
                                </Link>
                              </Button>
                            </MorphingDialogDescription>
                          </div>
                          <MorphingDialogClose className="text-muted-foreground" />
                        </MorphingDialogContent>
                      </MorphingDialogContainer>
                    </MorphingDialog>
                  ))}
                  {isFetchingNextPage &&
                    Array.from({ length: 3 }).map((_, i) => (
                      <PostCardSkeleton key={`skel-${i}`} />
                    ))}
                </div>

                {/* Load more */}
                {hasNextPage && !isFetchingNextPage && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => fetchNextPage()}
                    >
                      {t("landing.posts.loadMore")}
                    </Button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                {t("landing.posts.noResults")}
              </motion.p>
            )}
            </AnimatePresence>
          </section>
        </FadeIn>
      </div>
    </AnimatePresence>
  );
}
