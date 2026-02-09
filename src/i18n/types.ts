import { createContext } from "react";

export type Locale = "en" | "fr";

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

export const LocaleContext = createContext<LocaleContextValue | null>(null);
