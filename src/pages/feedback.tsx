import { useEffect } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import { useLocale } from "@/i18n/use-locale";

declare global {
  interface Window {
    Tally?: { loadEmbeds: () => void };
  }
}

export function FeedbackPage() {
  const { t } = useLocale();

  useEffect(() => {
    const TALLY_SRC = "https://tally.so/widgets/embed.js";

    if (window.Tally) {
      window.Tally.loadEmbeds();
      return;
    }

    if (document.querySelector(`script[src="${TALLY_SRC}"]`)) return;

    const script = document.createElement("script");
    script.src = TALLY_SRC;
    script.onload = () => window.Tally?.loadEmbeds();
    script.onerror = () => {
      document
        .querySelectorAll<HTMLIFrameElement>(
          "iframe[data-tally-src]:not([src])",
        )
        .forEach((el) => {
          el.src = el.dataset.tallySrc!;
        });
    };
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return (
    <article className="mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-6">
        <Button
          variant="ghost"
          size="lg"
          asChild
          className="w-fit text-muted-foreground"
        >
          <Link to="/">
            <ArrowLeft size={16} />
            {t("feedback.back")}
          </Link>
        </Button>
        <h1 className="text-3xl font-medium tracking-tight">
          {t("feedback.title")}
        </h1>
      </div>

      <Separator />

      <div>
        <iframe
          data-tally-src="https://tally.so/embed/obgQYP?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
          loading="lazy"
          width="100%"
          height={278}
          frameBorder={0}
          marginHeight={0}
          marginWidth={0}
          title="Beta Program Feedback 0.3"
          className="rounded-lg"
        />
      </div>

      <p className="text-xs text-muted-foreground/50">
        {t("feedback.fallback")}{" "}
        <a
          href="https://tally.so/r/obgQYP"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-muted-foreground"
        >
          tally.so
        </a>
      </p>
    </article>
  );
}
