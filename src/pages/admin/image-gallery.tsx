import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Loader2,
  X,
  ImageOff,
  Images,
  Trash2,
} from "lucide-react";
import {
  fetchMedia,
  uploadImage,
  deleteMedia,
  resizeImage,
  formatFileSize,
} from "@/lib/api";

export function ImageGallery({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const queryClient = useQueryClient();
  const { data: media = [], isLoading } = useQuery({
    queryKey: ["admin-media"],
    queryFn: () => fetchMedia(),
    enabled: open,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteMedia(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-media"] }),
  });

  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const resized = await resizeImage(file);
      const result = await uploadImage(resized);
      queryClient.invalidateQueries({ queryKey: ["admin-media"] });
      onSelect(result.url);
      onClose();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-foreground/5 px-6 py-4">
              <div className="flex items-center gap-2">
                <Images size={18} className="text-muted-foreground" />
                <h3 className="text-sm font-medium">Image Gallery</h3>
                <span className="text-xs text-muted-foreground">
                  {media.length} image{media.length !== 1 && "s"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span>
                      {uploading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Upload size={14} />
                      )}
                      Upload new
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUpload}
                  />
                </label>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="gallery-skeleton"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-3 gap-3 sm:grid-cols-4"
                >
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square animate-pulse rounded-lg bg-muted"
                    />
                  ))}
                </motion.div>
              ) : media.length === 0 ? (
                <motion.div
                  key="gallery-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground"
                >
                  <ImageOff size={32} strokeWidth={1.5} />
                  <p className="text-sm">No images yet</p>
                  <label className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload size={14} />
                        Upload your first image
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUpload}
                    />
                  </label>
                </motion.div>
              ) : (
                <motion.div
                  key="gallery-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                  className="grid grid-cols-3 gap-3 sm:grid-cols-4"
                >
                  {media.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg ring-1 ring-foreground/10 transition-all hover:ring-2 hover:ring-primary/50 hover:shadow-md"
                      onClick={() => {
                        onSelect(item.url);
                        onClose();
                      }}
                    >
                      <img
                        src={item.url}
                        alt={item.filename}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        loading="lazy"
                      />
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="p-2">
                          <p className="truncate text-xs font-medium text-white">
                            {item.filename}
                          </p>
                          <p className="text-[10px] text-white/70">
                            {item.width}x{item.height} · {formatFileSize(item.size)}
                          </p>
                        </div>
                      </div>
                      {/* Delete button */}
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          deleteMut.mutate(item.id);
                        }}
                        className="absolute top-1.5 right-1.5 z-10 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-all hover:bg-red-600 group-hover:opacity-100"
                      >
                        <Trash2 size={12} />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
