import { lazy, Suspense } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { slugify, getTextContent } from "@/components/toc";
import { cn } from "@/lib/utils";

const CodeBlock = lazy(() =>
  import("@/components/code-block").then((m) => ({ default: m.CodeBlock })),
);

const defaultClassName =
  "text-sm leading-7 text-muted-foreground break-words [&>*+*]:mt-5 [&_h1]:mt-8 [&_h1]:text-xl [&_h1]:font-medium [&_h1]:tracking-tight [&_h1]:text-foreground [&_h1]:scroll-mt-20 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-medium [&_h2]:tracking-tight [&_h2]:text-foreground [&_h2]:scroll-mt-20 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-foreground [&_h3]:scroll-mt-20 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_strong]:text-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-3 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_img]:mt-4 [&_img]:rounded-xl [&_img]:ring-1 [&_img]:ring-foreground/10 [&_hr]:border-border [&_hr]:my-6";

export function MarkdownRenderer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={cn(defaultClassName, className)}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          h1: ({ children, ...props }) => {
            const id = slugify(getTextContent(children));
            return (
              <h1 {...props} id={id}>
                {children}
              </h1>
            );
          },
          h2: ({ children, ...props }) => {
            const id = slugify(getTextContent(children));
            return (
              <h2 {...props} id={id}>
                {children}
              </h2>
            );
          },
          h3: ({ children, ...props }) => {
            const id = slugify(getTextContent(children));
            return (
              <h3 {...props} id={id}>
                {children}
              </h3>
            );
          },
          pre: ({ children }) => {
            const codeEl = children as React.ReactElement<{
              className?: string;
              children?: string;
            }>;
            if (codeEl?.props?.className?.startsWith("language-")) {
              const lang = codeEl.props.className.replace("language-", "");
              const code = String(codeEl.props.children ?? "").replace(
                /\n$/,
                "",
              );
              return (
                <Suspense
                  fallback={
                    <pre className="rounded-lg bg-muted p-4 overflow-x-auto">
                      <code className="text-xs">{code}</code>
                    </pre>
                  }
                >
                  <CodeBlock language={lang}>{code}</CodeBlock>
                </Suspense>
              );
            }
            return <pre>{children}</pre>;
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
