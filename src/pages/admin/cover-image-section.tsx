import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, X, ImageOff, Images } from "lucide-react";
import { ImagePositioner } from "./image-positioner";

export function CoverImageSection({
  image,
  imagePosition,
  imageError,
  imageUploading,
  onOpenGallery,
  onImageUpload,
  onImageUrlChange,
  onPositionChange,
  onClear,
}: {
  image: string | null;
  imagePosition: string | null;
  imageError: boolean;
  imageUploading: boolean;
  onOpenGallery: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageUrlChange: (url: string | null) => void;
  onPositionChange: (pos: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
        Cover image
      </Label>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" className="h-7 flex-1 text-xs" onClick={onOpenGallery}>
          <Images size={12} />
          Gallery
        </Button>
        <label className="cursor-pointer">
          <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
            <span>
              <Upload size={12} />
              Upload
            </span>
          </Button>
          <input type="file" accept="image/*" className="hidden" onChange={onImageUpload} />
        </label>
      </div>
      <Input
        placeholder="Or paste image URL"
        value={image || ""}
        onChange={(e) => onImageUrlChange(e.target.value || null)}
        className="h-7 text-[10px]"
      />
      {imageUploading && (
        <div className="relative overflow-hidden rounded-lg ring-1 ring-foreground/10">
          <div className="flex aspect-video w-full items-center justify-center bg-muted">
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-[10px]">Uploading...</span>
            </div>
          </div>
        </div>
      )}
      {!imageUploading && image && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex flex-col gap-1"
        >
          {!imageError ? (
            <div className="relative">
              <ImagePositioner
                src={image}
                position={imagePosition || "50% 50%"}
                onPositionChange={onPositionChange}
              />
              <button
                type="button"
                onClick={onClear}
                className="absolute top-8 right-2 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
              >
                <X size={10} />
              </button>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-lg ring-1 ring-foreground/10">
              <div className="flex aspect-video w-full items-center justify-center bg-muted">
                <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
                  <ImageOff size={16} />
                  <span className="text-[10px]">Failed to load</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClear}
                className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
              >
                <X size={10} />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
