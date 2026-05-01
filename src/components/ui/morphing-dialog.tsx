import React, {
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  motion,
  AnimatePresence,
  MotionConfig,
  type Transition,
  type Variant,
} from "motion/react";
import { createPortal } from "react-dom";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

type MorphingDialogContextType = {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  uniqueId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
};

const MorphingDialogContext =
  React.createContext<MorphingDialogContextType | null>(null);

function useMorphingDialog() {
  const context = useContext(MorphingDialogContext);
  if (!context) {
    throw new Error("useMorphingDialog must be used within a MorphingDialog");
  }
  return context;
}

function MorphingDialog({
  children,
  transition,
}: {
  children: React.ReactNode;
  transition?: Transition;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const uniqueId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null!);

  const contextValue = useMemo(
    () => ({ isOpen, setIsOpen, uniqueId, triggerRef }),
    [isOpen, uniqueId],
  );

  return (
    <MorphingDialogContext.Provider value={contextValue}>
      <MotionConfig
        transition={
          transition ?? { type: "spring", bounce: 0.05, duration: 0.3 }
        }
      >
        {children}
      </MotionConfig>
    </MorphingDialogContext.Provider>
  );
}

function MorphingDialogTrigger({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { setIsOpen, isOpen, uniqueId, triggerRef } = useMorphingDialog();

  const handleClick = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen, setIsOpen]);

  return (
    <motion.button
      ref={triggerRef}
      layoutId={`morphing-dialog-${uniqueId}`}
      className={cn("relative cursor-pointer text-left", className)}
      onClick={handleClick}
      style={style}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
    >
      {children}
    </motion.button>
  );
}

function MorphingDialogContainer({ children }: { children: React.ReactNode }) {
  const { isOpen, setIsOpen, uniqueId } = useMorphingDialog();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence initial={false} mode="sync">
      {isOpen && (
        <>
          <motion.div
            key={`backdrop-${uniqueId}`}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-6">
            {children}
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function MorphingDialogContent({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { setIsOpen, isOpen, uniqueId, triggerRef } = useMorphingDialog();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setIsOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      triggerRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, triggerRef]);

  return (
    <motion.div
      layoutId={`morphing-dialog-${uniqueId}`}
      className={cn("pointer-events-auto overflow-hidden", className)}
      style={style}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </motion.div>
  );
}

function MorphingDialogImage({
  src,
  alt,
  className,
  style,
  loading,
  decoding,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: "lazy" | "eager";
  decoding?: "async" | "sync" | "auto";
}) {
  const { uniqueId } = useMorphingDialog();

  return (
    <motion.img
      src={src}
      alt={alt}
      className={cn(className)}
      layoutId={`morphing-dialog-img-${uniqueId}`}
      style={style}
      loading={loading}
      decoding={decoding}
    />
  );
}

function MorphingDialogPlaceholder({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const { uniqueId } = useMorphingDialog();

  return (
    <motion.div
      className={cn(
        "flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5",
        className,
      )}
      layoutId={`morphing-dialog-img-${uniqueId}`}
      style={style}
    >
      <ImageOff className="size-8 text-muted-foreground/40" />
    </motion.div>
  );
}

function MorphingDialogTitle({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { uniqueId } = useMorphingDialog();

  return (
    <motion.div
      layoutId={`morphing-dialog-title-${uniqueId}`}
      className={className}
      style={style}
      layout
    >
      {children}
    </motion.div>
  );
}

function MorphingDialogSubtitle({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { uniqueId } = useMorphingDialog();

  return (
    <motion.div
      layoutId={`morphing-dialog-subtitle-${uniqueId}`}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

function MorphingDialogDescription({
  children,
  className,
  disableLayoutAnimation,
  variants,
}: {
  children: React.ReactNode;
  className?: string;
  disableLayoutAnimation?: boolean;
  variants?: { initial: Variant; animate: Variant; exit: Variant };
}) {
  const { uniqueId } = useMorphingDialog();

  return (
    <motion.div
      key={`morphing-dialog-desc-${uniqueId}`}
      layoutId={
        disableLayoutAnimation ? undefined : `morphing-dialog-desc-${uniqueId}`
      }
      variants={
        variants ?? {
          initial: { opacity: 0, scale: 0.95 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.95 },
        }
      }
      className={className}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

function MorphingDialogClose({
  children,
  className,
  variants,
}: {
  children?: React.ReactNode;
  className?: string;
  variants?: { initial: Variant; animate: Variant; exit: Variant };
}) {
  const { setIsOpen, uniqueId } = useMorphingDialog();

  return (
    <motion.button
      onClick={() => setIsOpen(false)}
      type="button"
      aria-label="Close dialog"
      key={`morphing-dialog-close-${uniqueId}`}
      className={cn("absolute top-4 right-4", className)}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={
        variants ?? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        }
      }
    >
      {children ?? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      )}
    </motion.button>
  );
}

export {
  // eslint-disable-next-line react-refresh/only-export-components
  useMorphingDialog,
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogClose,
  MorphingDialogTitle,
  MorphingDialogSubtitle,
  MorphingDialogDescription,
  MorphingDialogImage,
  MorphingDialogPlaceholder,
};
