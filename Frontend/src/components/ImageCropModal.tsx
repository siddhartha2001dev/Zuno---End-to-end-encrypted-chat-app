import React, { useState, useRef, useEffect } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Check,
  Loader2,
  Crop,
  ShieldCheck,
} from "lucide-react";

interface ImageCropModalProps {
  imageSrc: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => Promise<void>;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  imageSrc,
  isOpen,
  onClose,
  onCropComplete,
}) => {
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  // Viewport diameter for the circular mask
  const CROP_SIZE = 260; // diameter in pixels

  // Reset parameters when a new image is loaded
  useEffect(() => {
    if (imageSrc) {
      setScale(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setImageLoaded(false);
      setError(null);

      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        imageRef.current = img;
        setImageLoaded(true);
      };
    }
  }, [imageSrc]);

  // Pointer drag start
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  // Pointer drag move
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  // Pointer drag end
  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setScale((prev) => Math.min(Math.max(0.8, prev + delta), 3.5));
  };

  // Rotate 90 degrees
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset to initial
  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  // Export cropped circle
  const handleCropAndSave = async () => {
    if (!imageRef.current) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const OUTPUT_SIZE = 512; // High-resolution avatar export
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Unable to create canvas context");
      }

      ctx.imageSmoothingQuality = "high";
      ctx.imageSmoothingEnabled = true;

      // Fill with transparent or white background
      ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      // Create circular clipping path
      ctx.beginPath();
      ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      const img = imageRef.current;
      const imgWidth = img.naturalWidth || img.width;
      const imgHeight = img.naturalHeight || img.height;

      // Scaling factor between onscreen CROP_SIZE and exported OUTPUT_SIZE
      const exportFactor = OUTPUT_SIZE / CROP_SIZE;

      ctx.save();
      // Move to center of canvas
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      // Apply offset transformed to canvas coordinate space
      ctx.translate(offset.x * exportFactor, offset.y * exportFactor);
      // Apply rotation
      ctx.rotate((rotation * Math.PI) / 180);
      // Apply zoom scale
      ctx.scale(scale * exportFactor, scale * exportFactor);

      // Determine initial fit scale so the image covers the crop area nicely
      const minDimension = Math.min(imgWidth, imgHeight);
      const baseFit = CROP_SIZE / minDimension;

      const drawWidth = imgWidth * baseFit;
      const drawHeight = imgHeight * baseFit;

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      // Convert canvas to Blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92);
      });

      if (!blob) {
        throw new Error("Failed to process cropped image");
      }

      const croppedFile = new File([blob], `avatar-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      await onCropComplete(croppedFile);
      onClose();
    } catch (err: any) {
      console.error("Crop error:", err);
      setError(err.message || "Failed to crop and save image");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-theme-surface border border-theme-border rounded-2xl shadow-modal text-theme-text overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-theme-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-theme-accent/10 border border-theme-accent/20 flex items-center justify-center text-theme-accent">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-theme-text">Crop Profile Picture</h3>
              <p className="text-[11px] text-theme-text-muted">Drag to reposition • Zoom to fit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-bg transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Crop Viewport Area */}
        <div className="p-4 sm:p-6 flex flex-col items-center justify-center">
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onWheel={handleWheel}
            style={{ width: 280, height: 280 }}
            className={`relative rounded-2xl bg-black overflow-hidden touch-none flex items-center justify-center select-none shadow-inner ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            {/* The Image being transformed */}
            {imageSrc && (
              <img
                src={imageSrc}
                alt="Crop Target"
                draggable={false}
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${scale})`,
                  transformOrigin: "center center",
                  maxWidth: "100%",
                  maxHeight: "100%",
                }}
                className="pointer-events-none transition-transform duration-75 object-contain"
              />
            )}

            {/* Circular Mask Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Outer dimmed region */}
              <div
                style={{
                  width: CROP_SIZE,
                  height: CROP_SIZE,
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.65)",
                }}
                className="rounded-full border border-theme-accent/80 relative"
              >
                {/* 3x3 Grid overlay visible while dragging/adjusting */}
                <div
                  className={`absolute inset-0 rounded-full overflow-hidden pointer-events-none transition-opacity duration-200 ${
                    isDragging ? "opacity-70" : "opacity-25"
                  }`}
                >
                  <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                    <div className="border-r border-b border-white/40" />
                    <div className="border-r border-b border-white/40" />
                    <div className="border-b border-white/40" />
                    <div className="border-r border-b border-white/40" />
                    <div className="border-r border-b border-white/40" />
                    <div className="border-b border-white/40" />
                    <div className="border-r border-white/40" />
                    <div className="border-r border-white/40" />
                    <div />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Guidance */}
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-theme-text-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-theme-accent" />
            <span>Circular avatar preview matches your chat profile</span>
          </div>

          {/* Zoom & Adjustment Controls */}
          <div className="w-full mt-4 space-y-3 px-2">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setScale((prev) => Math.max(0.8, prev - 0.2))}
                className="p-1.5 rounded-lg bg-theme-bg hover:bg-theme-border text-theme-text-secondary hover:text-theme-text transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0.8"
                max="3"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="flex-1 accent-theme-accent h-1.5 bg-theme-border rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setScale((prev) => Math.min(3.5, prev + 0.2))}
                className="p-1.5 rounded-lg bg-theme-bg hover:bg-theme-border text-theme-text-secondary hover:text-theme-text transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions (Rotate & Reset) */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleRotate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-bg hover:bg-theme-border text-theme-text-secondary hover:text-theme-text border border-theme-border transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5 text-theme-accent" />
                <span>Rotate 90°</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-bg hover:bg-theme-border text-theme-text-muted hover:text-theme-text border border-theme-border transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset View</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="w-full mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-theme-border bg-theme-bg/40 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-2 rounded-lg text-xs font-medium text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleCropAndSave}
            disabled={isSubmitting || !imageLoaded}
            className="px-4 py-2 rounded-lg bg-theme-accent hover:opacity-90 text-white font-medium text-xs flex items-center gap-1.5 shadow-subtle disabled:opacity-50 cursor-pointer transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Set Profile Picture</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
