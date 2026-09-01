import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle2, Plus, Package, SlidersHorizontal, Check, ArrowRight } from 'lucide-react';
import { cn } from './utils';
import { getProductImage } from './api';

export default function VariantSelectorModal({ candidate, onClose, onSelectVariant }) {
  if (!candidate) return null;

  const product = candidate.product || candidate;
  const variants =
    candidate.variants && candidate.variants.length > 0
      ? candidate.variants
      : [product];

  const bestFitCode = product.code;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col w-full max-w-2xl max-h-[85vh] bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-200 bg-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SlidersHorizontal size={15} className="text-zinc-950" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Select Instrument Variant
              </span>
              <span className="px-2 py-0.5 text-[10.5px] font-semibold rounded-full bg-zinc-100 text-zinc-700">
                {variants.length} Configurations
              </span>
            </div>
            <h3 className="text-sm font-bold text-zinc-950 truncate max-w-md">
              {product.name}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
            title="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-3 bg-zinc-50 border-b border-zinc-200 text-xs text-zinc-600">
          <span>This surgical instrument family offers multiple working lengths and jaw dimensions. Choose a variant for your tray:</span>
        </div>

        {/* Variant List Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
          {variants.map((v, idx) => {
            const isBestFit = v.code === bestFitCode;
            const specs = v.specifications || {};
            const length =
              specs['Total length'] ||
              specs['length'] ||
              specs['working_length'] ||
              specs['Size'] ||
              specs['size'] ||
              'Standard';
            const handle = specs['Instrument handle'] || specs['handle'] || specs['Scalpel handle no.'];
            const matchPct = v.match_percent ?? product.match_percent ?? 90;

            return (
              <div
                key={v.code || idx}
                className={cn(
                  'p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3',
                  isBestFit
                    ? 'border-zinc-950 bg-zinc-50/80 ring-1 ring-zinc-950/10'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                )}
              >
                {/* Variant Info & Stats */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-white border border-zinc-200 p-1 flex items-center justify-center shrink-0">
                    {v.has_image || product.has_image ? (
                      <img
                        src={getProductImage(v.code || product.code)}
                        alt={v.name || product.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Package size={20} className="text-zinc-300" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-zinc-950 bg-zinc-100 px-2 py-0.5 rounded">
                        {v.code}
                      </span>
                      {isBestFit && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Check size={10} strokeWidth={3} /> Top Grounded Fit
                        </span>
                      )}
                      <span className="font-mono text-[11px] font-semibold text-zinc-500">
                        {matchPct}% Match
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-600 flex-wrap">
                      <span>Length/Profile: <strong className="text-zinc-900">{String(length)}</strong></span>
                      {handle && (
                        <>
                          <span className="text-zinc-300">•</span>
                          <span>Handle: {String(handle)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add Variant Button */}
                <button
                  onClick={() => {
                    onSelectVariant(v);
                    onClose();
                  }}
                  className={cn(
                    'w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0',
                    isBestFit
                      ? 'bg-zinc-950 hover:bg-black text-white shadow-xs'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200'
                  )}
                >
                  <Plus size={14} />
                  <span>Select Variant</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <span>{variants.length} configurations in catalog family</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
