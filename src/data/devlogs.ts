import type { ComponentType } from "react";
import HelloWorld, {
  frontmatter as helloWorldMeta,
} from "@/content/devlogs/hello-world.mdx";

export interface Devlog {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  image: string;
  Content: ComponentType;
}

function mdxToDevlog(
  slug: string,
  Content: ComponentType,
  meta: {
    title: string;
    date: string;
    summary: string;
    tags: string[];
    image: string;
  },
): Devlog {
  return { slug, Content, ...meta };
}

export const devlogs: Devlog[] = [
  mdxToDevlog("hello-world", HelloWorld, helloWorldMeta),
];

export function getDevlogBySlug(slug: string): Devlog | undefined {
  return devlogs.find((d) => d.slug === slug);
}

export function formatDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getDevlogsSorted(): Devlog[] {
  return [...devlogs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}
