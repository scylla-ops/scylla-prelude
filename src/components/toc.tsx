import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { List, ChevronDown } from "lucide-react";
import { useLocale } from "@/i18n/use-locale";

interface TocItem {
  id: string;
  text: string;
  level: 1 | 2 | 3;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/** Extract plain text from React children (for heading content) */
export function getTextContent(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(getTextContent).join("");
  if (children && typeof children === "object" && "props" in children) {
    return getTextContent(
      (children as React.ReactElement<{ children?: React.ReactNode }>).props
        .children,
    );
  }
  return "";
}

function parseHeadings(content: string): TocItem[] {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  const items: TocItem[] = [];
  const idCounts = new Map<string, number>();
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length as 1 | 2 | 3;
    const text = match[2].replace(/[*_`~\[\]]/g, "").trim();
    let id = slugify(text);

    // Deduplicate IDs
    const count = idCounts.get(id) ?? 0;
    if (count > 0) id = `${id}-${count + 1}`;
    idCounts.set(id, count + 1);

    items.push({ id, text, level });
  }

  return items;
}

export function TableOfContents({
  content,
  variant = "sidebar",
}: {
  content: string;
  variant?: "sidebar" | "inline";
}) {
  const items = useMemo(() => parseHeadings(content), [content]);
  const [clickedId, setClickedId] = useState<string | null>(null);

  if (items.length < 2) return null;

  const handleClick = (id: string) => {
    setClickedId(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav
      className={
        variant === "sidebar"
          ? "flex flex-col gap-0.5"
          : "flex flex-col gap-0.5 pb-2"
      }
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => handleClick(item.id)}
          className={`text-left text-xs leading-relaxed transition-colors duration-150 ${
            item.level === 2 ? "pl-2" : item.level === 3 ? "pl-4" : ""
          } ${
            clickedId === item.id
              ? "text-foreground font-medium border-l-2 border-foreground pl-2"
              : "text-muted-foreground hover:text-foreground border-l-2 border-transparent pl-2"
          }`}
        >
          {item.text}
        </button>
      ))}
    </nav>
  );
}

export function MobileToc({ content }: { content: string }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const items = useMemo(() => parseHeadings(content), [content]);

  if (items.length < 2) return null;

  return (
    <div className="xl:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <List size={14} />
        {t("devlog.toc.title")}
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 pb-1">
              <TableOfContents content={content} variant="inline" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
