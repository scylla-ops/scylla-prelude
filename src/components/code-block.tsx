import { useState, useEffect } from "react";
import { createHighlighter, type Highlighter } from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark", "github-light"],
      langs: [
        "typescript", "javascript", "tsx", "jsx",
        "rust", "go", "python", "bash", "shell",
        "json", "yaml", "toml", "sql", "html", "css",
        "dockerfile", "markdown",
      ],
    });
  }
  return highlighterPromise;
}

export function CodeBlock({
  language,
  children,
}: {
  language: string;
  children: string;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getHighlighter()
      .then((hl) => {
        if (cancelled) return;
        const lang = hl.getLoadedLanguages().includes(language) ? language : "text";
        const result = hl.codeToHtml(children, {
          lang,
          themes: { dark: "github-dark", light: "github-light" },
          defaultColor: false,
        });
        setHtml(result);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, [children, language]);

  if (error || !html) {
    return (
      <pre className="rounded-lg bg-muted p-4 overflow-x-auto">
        <code className="text-xs">{children}</code>
      </pre>
    );
  }

  return (
    <div
      className="code-block [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:text-xs [&_pre]:leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
