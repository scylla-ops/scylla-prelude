import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ExpandableSearch({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <motion.div
      ref={containerRef}
      className={`flex shrink-0 items-center overflow-hidden ${open ? "border-input rounded-md border bg-input/20 dark:bg-input/30" : ""}`}
      initial={false}
      animate={{ width: open ? "65%" : "auto" }}
      transition={{ type: "spring", bounce: 0.05, duration: 0.3 }}
    >
      {open ? (
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-auto w-full rounded-none border-0 bg-transparent text-xs shadow-none focus-visible:ring-0"
        />
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen(true)}
          aria-label="Search"
        >
          <Search size={16} />
        </Button>
      )}
    </motion.div>
  );
}

export { ExpandableSearch };
