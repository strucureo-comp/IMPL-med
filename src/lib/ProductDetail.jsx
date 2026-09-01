import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Package, PlusCircle, CheckCircle2, ShieldCheck, Tag, ExternalLink, ZoomIn, SlidersHorizontal, Check } from 'lucide-react';
import { cn } from './utils';
import { getProductImage, getProductFamily } from './api';
import ImageLightbox from './ImageLightbox';

export default function ProductDetail({ product: initialProduct, onClose, addToCart }) {
  const [selectedProduct, setSelectedProduct] = useState(initialProduct);
  const [familyVariants, setFamilyVariants] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const product = selectedProduct || initialProduct;

  useEffect(() => {
    setSelectedProduct(initialProduct);
    if (initialProduct?.code) {
      getProductFamily(initialProduct.code)
        .then((fam) => {
          if (fam?.variants && fam.variants.length > 0) {
            setFamilyVariants(fam.variants);
          }
        })
        .catch(() => {});
    }
  }, [initialProduct]);

  if (!product) return null;

  const increment = () => setQuantity((q) => Math.min(q + 1, 99));
  const decrement = () => setQuantity((q) => Math.max(q - 1, 1));

  const handleAddToCart = () => {
    addToCart(product, undefined, quantity);
    onClose();
  };

  const specs = product.specifications
    ? Object.entries(product.specifications).map(([key, value]) => ({ key, value }))
    : [];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-zinc-950/40 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex w-full max-w-4xl max-h-[90vh] flex-col md:flex-row overflow-hidden rounded-3xl bg-white border border-zinc-200 shadow-2xl"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-950 transition-colors cursor-pointer"
            title="Close dialog"
          >
            <X size={16} />
          </button>

          {/* Left: Product Image Stage */}
          <div className="flex items-center justify-center bg-zinc-50 p-8 md:w-1/2 border-b md:border-b-0 md:border-r border-zinc-100 relative">
            {product.has_image ? (
              <div
                onClick={() => setLightboxOpen(true)}
                className="relative group cursor-pointer w-full flex items-center justify-center"
                title="Click to view full-resolution image"
              >
                <img
                  src={getProductImage(product.code)}
                  alt={product.name}
                  className="max-h-[320px] w-full object-contain drop-shadow-xs group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-zinc-950/30 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                  <div className="flex items-center gap-1.5 bg-zinc-950 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-lg">
                    <ZoomIn size={14} />
                    <span>Enlarge Image</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-64 w-full items-center justify-center rounded-2xl bg-zinc-100 text-zinc-300">
                <Package size={56} />
              </div>
            )}
          </div>

          {/* Right: Technical Specs & Details */}
          <div className="flex flex-1 flex-col bg-white">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-zinc-950 bg-zinc-100 px-2.5 py-0.5 rounded-md border border-zinc-200">
                    {product.code}
                  </span>
                  {product.specialty && (
                    <span className="text-xs font-medium text-zinc-700 bg-zinc-100 px-2.5 py-0.5 rounded-full border border-zinc-200">
                      {product.specialty}
                    </span>
                  )}
                  {product.match_percent != null && (
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {Math.round(product.match_percent)}% Match
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-bold text-zinc-950 leading-snug">
                  {product.name}
                </h2>
              </div>

              {product.article_text && (
                <p className="text-xs leading-relaxed text-zinc-600 border-t border-zinc-100 pt-3">
                  {product.article_text}
                </p>
              )}

              {/* Specifications Table */}
              {specs.length > 0 && (
                <div className="border border-zinc-200 rounded-2xl overflow-hidden text-xs">
                  <div className="bg-zinc-50 px-3.5 py-2 font-bold text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-200 flex items-center gap-1.5">
                    <Tag size={12} className="text-zinc-400" />
                    <span>Technical Specifications</span>
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {specs.map(({ key, value }, i) => (
                      <div key={i} className="px-3.5 py-2 flex items-center justify-between text-zinc-700">
                        <span className="capitalize font-medium text-zinc-500">{key}</span>
                        <span className="font-mono text-zinc-950 font-semibold">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Family Variants Selection Table */}
              {familyVariants.length > 1 && (
                <div className="border border-zinc-200 rounded-2xl overflow-hidden text-xs">
                  <div className="bg-zinc-50 px-3.5 py-2 font-bold text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-200 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <SlidersHorizontal size={12} className="text-zinc-950" />
                      <span>Product Variants ({familyVariants.length})</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">Select configuration</span>
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {familyVariants.map((v) => {
                      const isCur = v.code === product.code;
                      const length =
                        v.specifications?.['Total length'] ||
                        v.specifications?.['length'] ||
                        'Standard';

                      return (
                        <button
                          key={v.code}
                          onClick={() => setSelectedProduct(v)}
                          className={cn(
                            'w-full px-3.5 py-2 flex items-center justify-between text-left transition-colors cursor-pointer',
                            isCur
                              ? 'bg-zinc-100 font-bold text-zinc-950'
                              : 'hover:bg-zinc-50 text-zinc-700'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-zinc-200">
                              {v.code}
                            </span>
                            <span>Length: {String(length)}</span>
                          </div>
                          {isCur && (
                            <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                              <Check size={12} /> Active
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Quantity & Add Action */}
            <div className="p-5 border-t border-zinc-200 bg-zinc-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
                  <button
                    onClick={decrement}
                    className="flex h-10 w-10 items-center justify-center text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="flex h-10 w-10 items-center justify-center font-mono text-xs font-bold text-zinc-950 border-x border-zinc-200">
                    {quantity}
                  </span>
                  <button
                    onClick={increment}
                    className="flex h-10 w-10 items-center justify-center text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-3 bg-zinc-950 hover:bg-black text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <PlusCircle size={16} />
                  <span>Add to Surgery Tray</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {lightboxOpen && product.has_image && (
        <ImageLightbox
          src={getProductImage(product.code)}
          title={`${product.code} - ${product.name}`}
          subtitle={`Specialty: ${product.specialty || 'General'}`}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
