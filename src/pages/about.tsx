import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { useLocale } from "@/i18n/use-locale";

export function AboutPage() {
  const { t } = useLocale();

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
            <HugeiconsIcon icon={ArrowLeft02Icon} size={16} />
            {t("about.back")}
          </Link>
        </Button>
        <h1 className="text-3xl font-medium tracking-tight">
          {t("about.title")}
        </h1>
      </div>

      <Separator />

      <div className="flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground">
        <p>{t("about.body1")}</p>
        <p>{t("about.body2")}</p>
        <p>{t("about.body3")}</p>
      </div>
    </article>
  );
}
