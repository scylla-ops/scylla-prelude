import { Link } from "react-router";
import { useLocale } from "@/i18n/use-locale";

export function SiteFooter() {
  const { t } = useLocale();

  return (
    <footer className="w-full">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
        <span>{t("footer.copyright")}</span>
        <Link to="/legal" className="hover:text-foreground transition-colors">
          {t("footer.legal")}
        </Link>
      </div>
    </footer>
  );
}
