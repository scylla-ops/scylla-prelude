import { Link } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useLocale } from "@/i18n/use-locale";

export function SiteHeader() {
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale } = useLocale();

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
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="text-muted-foreground"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={theme}
                initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </motion.span>
            </AnimatePresence>
          </Button>
        </div>
      </div>
    </header>
  );
}
