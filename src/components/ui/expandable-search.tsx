import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";

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
    <div ref={containerRef} className="flex h-8 items-center">
      <div
        className={`flex h-8 items-center overflow-hidden rounded-md transition-all duration-200 ease-out ${
          open
            ? "w-44 border border-input bg-background"
            : "w-8"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close search" : "Search"}
          className="flex size-8 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {open ? <X size={14} /> : <Search size={16} />}
        </button>
        <input
          ref={inputRef}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 min-w-0 flex-1 bg-transparent pr-2 text-xs outline-none placeholder:text-muted-foreground/60"
          tabIndex={open ? 0 : -1}
        />
      </div>
    </div>
  );
}

export { ExpandableSearch };
