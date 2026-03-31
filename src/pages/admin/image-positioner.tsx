import { useState, useRef, useCallback, useMemo } from "react";
import { Move } from "lucide-react";

function parsePosition(position: string) {
  const match = position.match(/([\d.]+)%\s+([\d.]+)%/);
  return match ? { x: parseFloat(match[1]), y: parseFloat(match[2]) } : { x: 50, y: 50 };
}

export function ImagePositioner({
  src,
  position,
  onPositionChange,
}: {
  src: string;
  position: string;
  onPositionChange: (pos: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  const propPos = useMemo(() => parsePosition(position), [position]);
  const pos = dragPos ?? propPos;

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
      setDragPos({ x, y });
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(true);
      handleMove(e.clientX, e.clientY);
    },
    [handleMove],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      handleMove(e.clientX, e.clientY);
    },
    [dragging, handleMove],
  );

  const handlePointerUp = useCallback(() => {
    if (dragging) {
      setDragging(false);
      const rounded = `${Math.round(pos.x)}% ${Math.round(pos.y)}%`;
      setDragPos(null);
      onPositionChange(rounded);
    }
  }, [dragging, pos, onPositionChange]);

  const positionStr = `${pos.x.toFixed(0)}% ${pos.y.toFixed(0)}%`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Move size={10} />
          Drag to reposition
        </span>
        <span className="font-mono text-[10px] text-muted-foreground/60">
          {positionStr}
        </span>
      </div>
      <div
        ref={containerRef}
        className={`relative aspect-video w-full cursor-crosshair select-none overflow-hidden rounded-lg ring-1 ring-foreground/10 ${dragging ? "ring-2 ring-primary/50" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ touchAction: "none" }}
      >
        <img
          src={src}
          alt="Position"
          className="h-full w-full object-cover"
          style={{ objectPosition: positionStr }}
          draggable={false}
        />
        {/* Crosshair indicator */}
        <div
          className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        />
        {/* Grid overlay while dragging */}
        {dragging && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/3 right-0 left-0 border-t border-white/20" />
            <div className="absolute top-2/3 right-0 left-0 border-t border-white/20" />
            <div className="absolute top-0 bottom-0 left-1/3 border-l border-white/20" />
            <div className="absolute top-0 bottom-0 left-2/3 border-l border-white/20" />
          </div>
        )}
      </div>
      {position !== "50% 50%" && (
        <button
          onClick={() => onPositionChange("50% 50%")}
          className="self-start text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Reset to center
        </button>
      )}
    </div>
  );
}
