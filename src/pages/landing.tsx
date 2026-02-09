import { useState, useMemo } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { getDevlogsSorted, formatDate } from "@/data/devlogs";

const filters = [
  { label: "Recent", tag: null },
  { label: "Devblog", tag: "devblog" },
  { label: "Announcement", tag: "announcement" },
  { label: "Community", tag: "community" },
] as const;

export function LandingPage() {
  const allDevblogs = getDevlogsSorted();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filteredDevlogs = useMemo(() => {
    let results = allDevblogs;

    if (activeFilter) {
      results = results.filter((d) => d.tags.includes(activeFilter));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.summary.toLowerCase().includes(q),
      );
    }

    return results;
  }, [allDevblogs, activeFilter, search]);

  return (
    <div className="flex flex-col gap-16">
      <section className="flex flex-col gap-3">
        <h1 className="text-xl font-medium tracking-tight">
          Welcome to the Scylla devblog!
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We started this devblog because we believe in building in the open.
          You'll find updates on where the project stands, what we're working
          on, and where we're headed. We want your feedback, and we want you to
          be part of the conversation as Scylla takes shape.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium tracking-tight">What is Scylla?</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          An open-core CI platform, delivered as a PaaS and deployable anywhere.
          A real alternative to tools where cost or lock-in make the decisions
          for you.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We focus on ease of use, support for applications at any scale, and
          high performance.{" "}
          <Link
            to="/about"
            className="text-foreground underline underline-offset-3 hover:text-muted-foreground"
          >
            Learn more.
          </Link>
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Latest Posts
        </h3>
        <div className="flex items-center gap-2">
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
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-auto w-40"
          />
        </div>

        {filteredDevlogs.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDevlogs.map((devlog) => (
              <MorphingDialog key={devlog.slug}>
                <div className="group relative">
                  <MorphingDialogTrigger className="overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-card">
                    <MorphingDialogImage
                      src={devlog.image}
                      alt={devlog.title}
                      className="aspect-video w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="p-4">
                      <MorphingDialogTitle>
                        <p className="text-sm font-medium">{devlog.title}</p>
                      </MorphingDialogTitle>
                      <MorphingDialogSubtitle>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(devlog.date)}
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
                      Read
                      <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                    </Link>
                  </Button>
                </div>

                <MorphingDialogContainer>
                  <MorphingDialogContent className="relative w-full max-w-md rounded-xl bg-card ring-1 ring-foreground/10">
                    <MorphingDialogImage
                      src={devlog.image}
                      alt={devlog.title}
                      className="aspect-video w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="p-6">
                      <MorphingDialogTitle>
                        <p className="text-base font-medium">{devlog.title}</p>
                      </MorphingDialogTitle>
                      <MorphingDialogSubtitle>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(devlog.date)}
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
                            Read More
                            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
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
            No results found.
          </p>
        )}
      </section>
    </div>
  );
}
