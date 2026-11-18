import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  images,
  currentIndex,
  title,
  subtitle,
  onClose,
  onChangeIndex,
}) => {
  const safeImages = images.filter(Boolean);
  const safeIndex = Math.min(Math.max(0, currentIndex), Math.max(0, safeImages.length - 1));
  const currentSrc = safeImages[safeIndex];

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowLeft' && safeImages.length > 1) {
        onChangeIndex((safeIndex - 1 + safeImages.length) % safeImages.length);
      } else if (e.key === 'ArrowRight' && safeImages.length > 1) {
        onChangeIndex((safeIndex + 1) % safeImages.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, safeIndex, safeImages.length, onClose, onChangeIndex]);

  if (!isOpen || !currentSrc) return null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeIndex((safeIndex - 1 + safeImages.length) % safeImages.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeIndex((safeIndex + 1) % safeImages.length);
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-sm flex flex-col justify-between animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title ? `Enlarged photo of ${title}` : 'Enlarged artwork photo'}
    >
      {/* Top Bar */}
      <div
        className="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 text-white bg-gradient-to-b from-black/80 to-transparent shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          {title && (
            <h3 className="font-display font-bold text-sm sm:text-base text-white truncate">
              {title}
            </h3>
          )}
          <div className="flex items-center gap-2 text-[11px] text-white/75 font-mono">
            {subtitle && <span className="truncate">{subtitle}</span>}
            {safeImages.length > 1 && (
              <span>
                {subtitle ? '• ' : ''}Photo {safeIndex + 1} of {safeImages.length}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0"
          aria-label="Close enlarged image"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Uncropped Artwork Viewport */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-3 sm:px-14 py-2">
        {safeImages.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 border border-white/20 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <img
          src={currentSrc}
          alt={title || 'Enlarged artwork'}
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-2xl select-none"
        />

        {safeImages.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 sm:right-4 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 border border-white/20 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
            aria-label="Next photo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnails / Hint */}
      <div
        className="px-4 py-3 flex items-center justify-center gap-2 bg-gradient-to-t from-black/80 to-transparent shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {safeImages.length > 1 ? (
          safeImages.map((imgUrl, idx) => (
            <button
              key={`${imgUrl}-${idx}`}
              type="button"
              onClick={() => onChangeIndex(idx)}
              className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                idx === safeIndex
                  ? 'border-[#b91c1c] scale-105'
                  : 'border-white/25 opacity-65 hover:opacity-100'
              }`}
              aria-label={`View photo ${idx + 1}`}
            >
              <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))
        ) : (
          <span className="text-[11px] text-white/60">
            Tap outside image or press Close to return
          </span>
        )}
      </div>
    </div>
  );
};
