import { useEffect, useState } from "react";
import { LocaleContext } from "./types";
import type { Locale } from "./types";
import en from "./en.json";
import fr from "./fr.json";

const translations: Record<Locale, Record<string, string>> = { en, fr };

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("locale");
  if (stored === "en" || stored === "fr") return stored;
  const browser = navigator.language.slice(0, 2);
  return browser === "fr" ? "fr" : "en";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    localStorage.setItem("locale", locale);
    document.documentElement.lang = locale;
  }, [locale]);

  function setLocale(l: Locale) {
    setLocaleState(l);
  }

  function t(key: string): string {
    return translations[locale][key] ?? translations.en[key] ?? key;
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}
