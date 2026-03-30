import { useState, useMemo } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExpandableSearch } from "@/components/ui/expandable-search";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogImage,
  MorphingDialogTitle,
  MorphingDialogSubtitle,
  MorphingDialogDescription,
  MorphingDialogClose,
} from "@/components/ui/morphing-dialog";
import { ArrowRight } from "lucide-react";
import { fetchPosts, formatDate } from "@/lib/api";
import { useLocale } from "@/i18n/use-locale";

const easeOutSine = [0.39, 0.575, 0.565, 1] as const;
const staggerDelay = 0.12;

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

export function LandingPage() {
  const { t, locale } = useLocale();

  const filters = [
    { label: t("filter.recent"), tag: null },
    { label: t("filter.devblog"), tag: "devblog" },
    { label: t("filter.announcement"), tag: "announcement" },
    { label: t("filter.community"), tag: "community" },
  ];
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const { data: allDevblogs = [] } = useQuery({
    queryKey: ["posts", locale, activeFilter],
    queryFn: () => fetchPosts(locale, activeFilter),
  });

  const filteredDevlogs = useMemo(() => {
    if (!search.trim()) return allDevblogs;
    const q = search.toLowerCase();
    return allDevblogs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.summary.toLowerCase().includes(q),
    );
  }, [allDevblogs, search]);

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

        <FadeIn index={5}>
          <section className="flex flex-col gap-4">
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {t("landing.posts.title")}
            </h3>
            {/* Mobile: scrollable filters + expandable search icon */}
            <div className="flex items-center gap-1 sm:hidden">
              <div
                className="min-w-0 flex-1 overflow-x-auto"
                style={{
                  maskImage:
                    "linear-gradient(to right, black calc(100% - 24px), transparent)",
                  WebkitMaskImage:
                    "linear-gradient(to right, black calc(100% - 24px), transparent)",
                }}
              >
                <div className="flex items-center gap-1">
                  {filters.map((f) => (
                    <Button
                      key={f.label}
                      variant="ghost"
                      size="sm"
                      className={activeFilter === f.tag ? "bg-muted" : ""}
                      onClick={() => setActiveFilter(f.tag)}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
              </div>
              <ExpandableSearch
                value={search}
                onChange={setSearch}
                placeholder={t("search.placeholder")}
              />
            </div>

            {/* Desktop: filters + inline search input */}
            <div className="hidden sm:flex sm:items-center">
              <div className="flex items-center gap-1">
                {filters.map((f) => (
                  <Button
                    key={f.label}
                    variant="ghost"
                    size="sm"
                    className={activeFilter === f.tag ? "bg-muted" : ""}
                    onClick={() => setActiveFilter(f.tag)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
              <Input
                placeholder={t("search.placeholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ml-auto w-40"
              />
            </div>

            {filteredDevlogs.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDevlogs.map((devlog) => (
                  <MorphingDialog key={`${devlog.slug}-${devlog.locale}`}>
                    <div className="group relative">
                      <MorphingDialogTrigger className="overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-card">
                        <MorphingDialogImage
                          src={devlog.image || ""}
                          alt={devlog.title}
                          className="aspect-video w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="p-4">
                          <MorphingDialogTitle>
                            <p className="text-sm font-medium">
                              {devlog.title}
                            </p>
                          </MorphingDialogTitle>
                          <MorphingDialogSubtitle>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDate(devlog.created_at, locale)}
                            </p>
                          </MorphingDialogSubtitle>
                        </div>
                      </MorphingDialogTrigger>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="absolute bottom-3 right-3 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <Link
                          to={`/devlogs/${devlog.slug}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t("landing.posts.read")}
                          <ArrowRight size={14} />
                        </Link>
                      </Button>
                    </div>

                    <MorphingDialogContainer>
                      <MorphingDialogContent className="relative w-full max-w-md rounded-xl bg-card ring-1 ring-foreground/10">
                        <MorphingDialogImage
                          src={devlog.image || ""}
                          alt={devlog.title}
                          className="aspect-video w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="p-6">
                          <MorphingDialogTitle>
                            <p className="text-base font-medium">
                              {devlog.title}
                            </p>
                          </MorphingDialogTitle>
                          <MorphingDialogSubtitle>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDate(devlog.created_at, locale)}
                            </p>
                          </MorphingDialogSubtitle>
                          <MorphingDialogDescription
                            disableLayoutAnimation
                            className="mt-4"
                          >
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {devlog.summary}
                            </p>
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
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("landing.posts.noResults")}
              </p>
            )}
          </section>
        </FadeIn>
      </div>
    </AnimatePresence>
  );
}
