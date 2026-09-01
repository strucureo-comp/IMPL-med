import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCcw, Package, Layers } from 'lucide-react';
import { cn } from './utils';

export default function ImageLightbox({
  src,
  alt = 'Instrument High-Resolution Preview',
  title = '',
  subtitle = '',
  compareSrc = null,
  compareTitle = '',
  onClose,
}) {
  const [scale, setScale] = useState(1);
  const [activeMode, setActiveMode] = useState(compareSrc ? 'split' : 'single');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const zoomIn = () => setScale((s) => Math.min(s + 0.3, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.3, 0.7));
  const resetZoom = () => setScale(1);

  if (!src && !compareSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Main Lightbox Frame */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col w-full max-w-5xl max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden text-white"
      >
        {/* Header */}
        <div className="h-16 px-6 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">
                {title || 'Instrument High-Resolution Preview'}
              </h3>
              {subtitle && (
                <p className="text-xs text-zinc-400 font-mono leading-tight mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>

            {compareSrc && (
              <div className="hidden sm:flex items-center gap-1 bg-zinc-900 p-0.5 rounded-full border border-zinc-800 ml-4 text-xs font-medium">
                <button
                  onClick={() => setActiveMode('single')}
                  className={cn(
                    'px-3 py-1 rounded-full transition-colors cursor-pointer',
                    activeMode === 'single' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                  )}
                >
                  Single View
                </button>
                <button
                  onClick={() => setActiveMode('split')}
                  className={cn(
                    'px-3 py-1 rounded-full transition-colors cursor-pointer',
                    activeMode === 'split' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                  )}
                >
                  Side-by-Side Diff
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-full border border-zinc-800">
              <button
                onClick={zoomOut}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-[11px] font-mono font-semibold px-1 text-zinc-300">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={resetZoom}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors ml-0.5"
                title="Reset Zoom"
              >
                <RotateCcw size={12} />
              </button>
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
              title="Close Preview (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Image Stage */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-zinc-950 relative min-h-[420px]">
          {activeMode === 'split' && compareSrc ? (
            /* Split Side-by-Side View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full h-full max-h-[65vh]">
              {/* Left: Reference / Competitor Image */}
              <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-xs font-bold text-zinc-400 mb-3 uppercase tracking-wider">
                  {title || 'Requirement / External Reference'}
                </span>
                <div className="flex-1 flex items-center justify-center overflow-hidden w-full">
                  {src ? (
                    <img
                      src={src}
                      alt={title}
                      style={{
                        transform: `scale(${scale})`,
                        transition: 'transform 0.15s ease-out',
                      }}
                      className="max-h-[45vh] max-w-full object-contain rounded-xl"
                    />
                  ) : (
                    <div className="text-zinc-500 flex flex-col items-center gap-2">
                      <Package size={44} />
                      <span className="text-xs">No reference image available</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Matched IMPL Instrument Image */}
              <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-xs font-bold text-white mb-3 uppercase tracking-wider">
                  {compareTitle || 'Matched IMPL Instrument'}
                </span>
                <div className="flex-1 flex items-center justify-center overflow-hidden w-full">
                  {compareSrc ? (
                    <img
                      src={compareSrc}
                      alt={compareTitle}
                      style={{
                        transform: `scale(${scale})`,
                        transition: 'transform 0.15s ease-out',
                      }}
                      className="max-h-[45vh] max-w-full object-contain rounded-xl bg-white/5 p-3"
                    />
                  ) : (
                    <div className="text-zinc-500 flex flex-col items-center gap-2">
                      <Package size={44} />
                      <span className="text-xs">No catalog image available</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Single Large Image View */
            <div className="flex items-center justify-center w-full h-full overflow-hidden">
              <img
                src={src || compareSrc}
                alt={alt}
                style={{
                  transform: `scale(${scale})`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-[65vh] max-w-full object-contain rounded-xl bg-white/5 p-4"
              />
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="h-12 px-6 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-400 font-medium shrink-0">
          <span>Click anywhere outside or press Esc to close</span>
          <span className="font-mono text-[11px] text-zinc-500">
            Precision optical zoom & geometry inspection
          </span>
        </div>
      </motion.div>
    </div>
  );
}
