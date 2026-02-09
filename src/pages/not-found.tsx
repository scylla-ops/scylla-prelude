import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocale } from "@/i18n/use-locale";

export function NotFoundPage() {
  const { t } = useLocale();

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <h1 className="text-xl font-medium tracking-tight">
        {t("notFound.title")}
      </h1>
      <p className="text-sm text-muted-foreground">{t("notFound.body")}</p>
      <Button variant="outline" size="lg" asChild>
        <Link to="/">
          <ArrowLeft size={16} />
          {t("notFound.back")}
        </Link>
      </Button>
    </div>
  );
}
