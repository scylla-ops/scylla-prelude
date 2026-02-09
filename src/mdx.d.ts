declare module "*.mdx" {
  import type { ComponentType } from "react";

  export const frontmatter: {
    title: string;
    date: string;
    summary: string;
    tags: string[];
    image: string;
    authors?: string[];
  };

  const MDXComponent: ComponentType;
  export default MDXComponent;
}
