import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useLocale } from "@/i18n/use-locale";

export function SiteHeader() {
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useLocale();

  return (
    <header className="w-full">
      <div className="mx-auto flex max-w-3xl items-center px-6 py-6 sm:py-12">
        <Link to="/" className="text-md font-medium">
          Scylla
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            onClick={() => setLocale(locale === "en" ? "fr" : "en")}
            aria-label="Toggle language"
          >
            <span className="text-muted-foreground">
              {locale === "en" ? "FR" : "EN"}
            </span>
          </Button>
          <Button
            variant="ghost"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <span className="text-muted-foreground">
              {theme === "dark" ? t("header.light") : t("header.dark")}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
