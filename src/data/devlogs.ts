import type { ComponentType } from "react";
import type { Locale } from "@/i18n/types";
import HelloWorldEn, {
  frontmatter as helloWorldMetaEn,
} from "@/content/devlogs/hello-world.mdx";
import HelloWorldFr, {
  frontmatter as helloWorldMetaFr,
} from "@/content/devlogs/fr/hello-world.mdx";

export interface Devlog {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  image: string;
  authors: string[];
  Content: ComponentType;
}

interface DevlogMeta {
  title: string;
  date: string;
  summary: string;
  tags: string[];
  image: string;
  authors?: string[];
}

interface LocalizedDevlog {
  slug: string;
  locales: Record<Locale, { Content: ComponentType; meta: DevlogMeta }>;
}

const localizedDevlogs: LocalizedDevlog[] = [
  {
    slug: "hello-world",
    locales: {
      en: { Content: HelloWorldEn, meta: helloWorldMetaEn },
      fr: { Content: HelloWorldFr, meta: helloWorldMetaFr },
    },
  },
];

function resolveDevlog(entry: LocalizedDevlog, locale: Locale): Devlog {
  const { Content, meta } = entry.locales[locale] ?? entry.locales.en;
  return { slug: entry.slug, Content, authors: [], ...meta };
}

function resolveAll(locale: Locale): Devlog[] {
  return localizedDevlogs.map((d) => resolveDevlog(d, locale));
}

export function getDevlogBySlug(
  slug: string,
  locale: Locale = "en",
): Devlog | undefined {
  const entry = localizedDevlogs.find((d) => d.slug === slug);
  return entry ? resolveDevlog(entry, locale) : undefined;
}

export function getDevlogsSorted(locale: Locale = "en"): Devlog[] {
  return resolveAll(locale).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function formatDate(date: string, locale: string = "en"): string {
  const localeMap: Record<string, string> = { en: "en-US", fr: "fr-FR" };
  return new Date(date + "T00:00:00").toLocaleDateString(
    localeMap[locale] ?? "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );
}
