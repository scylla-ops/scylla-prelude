import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { useLocale } from "@/i18n/use-locale";

export function LegalPage() {
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
            {t("legal.back")}
          </Link>
        </Button>
        <h1 className="text-3xl font-medium tracking-tight">
          {t("legal.title")}
        </h1>
      </div>

      <Separator />

      <div className="flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground">
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">
            {t("legal.publisher.title")}
          </h2>
          <p>{t("legal.publisher.body")}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">
            {t("legal.hosting.title")}
          </h2>
          <p>{t("legal.hosting.body")}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">
            {t("legal.data.title")}
          </h2>
          <p>{t("legal.data.body")}</p>
        </section>
      </div>
    </article>
  );
}
