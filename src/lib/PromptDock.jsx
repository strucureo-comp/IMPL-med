import { useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, X, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './utils';

export default function PromptDock({
  requirement,
  onRequirementChange,
  isRunning,
  onSubmit,
  onStop,
  onAttach,
  imagePreview,
  onClearImage,
  autoFocus = false,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (requirement.trim() || imagePreview) {
        onSubmit();
      }
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        onAttach(item.getAsFile());
        break;
      }
    }
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto mt-4 mb-8 px-4 sm:px-0">
      <motion.div 
        layout
        className={cn(
          "bg-white/90 backdrop-blur-xl rounded-[1.5rem] p-1.5 flex flex-col transition-all duration-300",
          "shadow-[var(--shadow-dock)]",
          "border-glow-premium",
          isRunning ? "active" : ""
        )}
      >
        <AnimatePresence>
          {imagePreview && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="px-4 overflow-hidden"
            >
              <div className="relative inline-block group mt-1">
                <img
                  src={imagePreview}
                  alt="Attachment"
                  className="h-16 w-auto rounded-lg border border-slate-200 object-cover bg-slate-50"
                />
                <button
                  type="button"
                  onClick={onClearImage}
                  className="absolute -top-2 -right-2 bg-slate-900 hover:bg-black text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-md scale-90 group-hover:scale-100"
                >
                  <X size={12} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2 relative z-10 px-2 py-0.5">
          <button
            type="button"
            onClick={onAttach}
            disabled={isRunning}
            className="p-2 mb-1 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50 shrink-0"
            title="Attach image"
          >
            <ImageIcon size={22} />
          </button>

          <textarea
            ref={inputRef}
            value={requirement}
            onChange={(e) => onRequirementChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Describe an instrument, paste a code, or drop an image..."
            disabled={isRunning}
            className="flex-1 max-h-32 min-h-[44px] py-3 bg-transparent text-slate-900 text-[16px] placeholder:text-slate-400 resize-none outline-none leading-relaxed disabled:opacity-50 font-medium"
            rows={1}
          />

          {isRunning ? (
            <button
              type="button"
              onClick={onStop}
              className="p-2 mb-1 mr-1 rounded-full text-slate-900 hover:text-blue-600 hover:bg-blue-50 shrink-0 transition-colors"
            >
              <Square size={22} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={(!requirement.trim() && !imagePreview) || isRunning}
              className="p-2 mb-1 mr-1 rounded-full text-blue-600 disabled:text-slate-300 hover:bg-blue-50 shrink-0 transition-colors"
            >
              <Send size={22} />
            </button>
          )}
        </div>
      </motion.div>
      <div className="mt-3 text-center text-[12px] text-slate-400 font-medium opacity-80">
        IMPL AI can make mistakes. Verify critical specifications.
      </div>
    </div>
  );
}
