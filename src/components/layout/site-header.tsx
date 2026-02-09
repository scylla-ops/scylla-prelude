import { Link } from "react-router";
// import { HugeiconsIcon } from "@hugeicons/react";
// import { SunIcon, MoonIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

export function SiteHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="w-full">
      <div className="mx-auto flex max-w-3xl items-center px-6 py-6 sm:py-12">
        <Link to="/" className="text-md font-medium">
          Scylla
        </Link>
        <Button
          variant="ghost"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="ml-auto"
        >
          {/*<HugeiconsIcon
            icon={theme === "dark" ? SunIcon : MoonIcon}
            strokeWidth={2}
          />*/}
          <span className="text-muted-foreground">
            {theme === "dark" ? "light" : "dark"}
          </span>
        </Button>
      </div>
    </header>
  );
}
