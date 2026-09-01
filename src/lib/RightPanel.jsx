import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Trash2, Package, ShoppingBag, Download, FileText, ZoomIn } from 'lucide-react';
import { cn } from './utils';
import { getProductImage } from './api';
import ImageLightbox from './ImageLightbox';

function getRowMatch(item) {
  const m = item?.meta?.match_percent ?? item?.product?.match_percent;
  return m == null ? null : Math.round(Number(m));
}

function TrayRow({ item, onUpdateQuantity, onRemove, onSelectProduct }) {
  const p = item.product;
  const name = p?.name || item.product_code;
  const hasImage = p?.has_image;
  const pct = getRowMatch(item);
  const isExact = pct === 100;

  return (
    <div
      onClick={() => onSelectProduct?.(p || { code: item.product_code, name })}
      className={cn(
        'group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer bg-white shadow-2xs',
        isExact
          ? 'border-zinc-300 hover:border-zinc-950'
          : 'border-zinc-200 hover:border-zinc-400'
      )}
    >
      {/* Product Image Thumbnail */}
      <div className="w-10 h-10 shrink-0 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center p-1 overflow-hidden">
        {hasImage ? (
          <img
            src={getProductImage(item.product_code)}
            alt={name}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        ) : (
          <Package size={16} className="text-zinc-300" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-zinc-900 leading-tight">
          {name}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="font-mono text-[10.5px] font-semibold text-zinc-500 bg-zinc-100 px-1.5 py-0.2 rounded">
            {item.product_code}
          </span>
          {pct != null && (
            <span
              className={cn(
                'font-mono text-[9.5px] font-semibold px-1.5 py-0.2 rounded',
                isExact
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-zinc-100 text-zinc-600'
              )}
            >
              {pct}% fit
            </span>
          )}
        </div>
      </div>

      {/* Quantity & Delete Controls */}
      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
          <button
            onClick={() => onUpdateQuantity(item.product_code, -1)}
            className="p-1 rounded text-zinc-500 hover:text-zinc-950 hover:bg-white transition-colors cursor-pointer"
            title="Decrease quantity"
          >
            <Minus size={11} />
          </button>
          <span className="w-5 text-center font-mono font-bold text-xs text-zinc-900">
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdateQuantity(item.product_code, 1)}
            className="p-1 rounded text-zinc-500 hover:text-zinc-950 hover:bg-white transition-colors cursor-pointer"
            title="Increase quantity"
          >
            <Plus size={11} />
          </button>
        </div>

        <button
          onClick={() => onRemove(item.product_code)}
          className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
          title="Remove from tray"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export default function RightPanel({
  cartItems = [],
  onRemoveFromCart,
  onUpdateQuantity,
  onCheckout,
  onClearCart,
  selectedProduct,
  onSelectProduct,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState(selectedProduct ? 'spec' : 'tray');
  const [previewImage, setPreviewImage] = useState(null);

  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const activeProduct = selectedProduct || cartItems[0]?.product;

  return (
    <>
      <div className="md:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex h-full w-[85%] sm:w-80 lg:w-[340px] md:relative shrink-0 flex-col bg-white border-l border-zinc-200 text-zinc-900 text-xs shadow-2xl md:shadow-none transition-transform">
      {/* Top Header & Switcher */}
      <div className="h-14 px-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-full">
          <button
            onClick={() => setActiveTab('tray')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer',
              activeTab === 'tray'
                ? 'bg-white text-zinc-950 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-900'
            )}
          >
            <ShoppingBag size={12} />
            <span>Tray ({cartItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('spec')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer',
              activeTab === 'spec'
                ? 'bg-white text-zinc-950 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-900'
            )}
          >
            <FileText size={12} />
            <span>Specifications</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-950 transition-colors cursor-pointer"
          title="Close tray"
        >
          <X size={15} />
        </button>
      </div>

      {/* Main Panel Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
        {activeTab === 'tray' ? (
          cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 mb-3">
                <ShoppingBag size={18} />
              </div>
              <p className="text-sm font-semibold text-zinc-900">Surgery Tray is Empty</p>
              <p className="mt-1 text-xs text-zinc-500 max-w-[200px] leading-relaxed">
                Add matched instruments from AI search or catalog to assemble your surgical set.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {cartItems.map((item) => (
                <TrayRow
                  key={item.id || item.product_code}
                  item={item}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemove={onRemoveFromCart}
                  onSelectProduct={onSelectProduct}
                />
              ))}
            </div>
          )
        ) : activeProduct ? (
          /* Spec Inspector Tab */
          <div className="space-y-3">
            <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2.5">
              <div className="flex items-start gap-3">
                <div
                  onClick={() => activeProduct.has_image && setPreviewImage(activeProduct)}
                  className={cn(
                    'w-12 h-12 rounded-lg bg-white border border-zinc-200 p-1 flex items-center justify-center shrink-0 relative group overflow-hidden',
                    activeProduct.has_image && 'cursor-pointer'
                  )}
                >
                  {activeProduct.has_image ? (
                    <>
                      <img
                        src={getProductImage(activeProduct.code)}
                        alt={activeProduct.name}
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-zinc-950/40 rounded opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                        <ZoomIn size={13} />
                      </div>
                    </>
                  ) : (
                    <Package size={18} className="text-zinc-300" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[10.5px] font-bold text-white bg-zinc-950 px-1.5 py-0.2 rounded">
                    {activeProduct.code}
                  </span>
                  <h4 className="font-semibold text-zinc-900 mt-1 leading-snug line-clamp-2 text-xs">
                    {activeProduct.name}
                  </h4>
                </div>
              </div>

              {activeProduct.article_text && (
                <p className="text-[11.5px] text-zinc-600 leading-relaxed border-t border-zinc-200 pt-2">
                  {activeProduct.article_text}
                </p>
              )}
            </div>

            {/* Attributes Matrix */}
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="px-3 py-1.5 bg-zinc-50 border-b border-zinc-200 font-semibold text-zinc-500 text-[10.5px] uppercase tracking-wider">
                Product Attributes
              </div>
              <div className="divide-y divide-zinc-100 text-xs">
                <div className="px-3 py-2 flex justify-between">
                  <span className="text-zinc-500">Specialty</span>
                  <span className="font-medium text-zinc-900">{activeProduct.specialty || 'General'}</span>
                </div>
                {activeProduct.family_id && (
                  <div className="px-3 py-2 flex justify-between">
                    <span className="text-zinc-500">Family</span>
                    <span className="font-mono text-zinc-900">{activeProduct.family_id}</span>
                  </div>
                )}
                {activeProduct.match_percent != null && (
                  <div className="px-3 py-2 flex justify-between">
                    <span className="text-zinc-500">Requirement Fit</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {Math.round(activeProduct.match_percent)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Technical Specifications */}
            {activeProduct.specifications && Object.keys(activeProduct.specifications).length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="px-3 py-1.5 bg-zinc-50 border-b border-zinc-200 font-semibold text-zinc-500 text-[10.5px] uppercase tracking-wider">
                  Technical Specifications
                </div>
                <div className="divide-y divide-zinc-100 text-xs">
                  {Object.entries(activeProduct.specifications).map(([key, val]) => (
                    <div key={key} className="px-3 py-2 flex justify-between gap-2">
                      <span className="capitalize text-zinc-500 shrink-0">{key}</span>
                      <span className="font-mono text-right text-zinc-900 truncate font-medium">
                        {String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <FileText size={20} className="text-zinc-300 mb-2" />
            <p className="text-xs font-semibold text-zinc-900">No Product Selected</p>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-[190px]">
              Click any instrument to view its specifications.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Footer Actions */}
      <div className="p-3.5 border-t border-zinc-200 bg-white shrink-0 space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-600 px-0.5">
          <span>Set Total</span>
          <span className="font-mono font-bold text-zinc-950">
            {totalQuantity} units ({cartItems.length} lines)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClearCart}
            disabled={cartItems.length === 0}
            className="px-3 py-2 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>

          <button
            onClick={onCheckout}
            disabled={cartItems.length === 0}
            className="flex-1 py-2 px-3 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <Download size={13} />
            <span>Export Set Report</span>
          </button>
        </div>
      </div>

      {previewImage && (
        <ImageLightbox
          src={getProductImage(previewImage.code)}
          title={`${previewImage.code} — ${previewImage.name}`}
          subtitle={`Specialty: ${previewImage.specialty || 'General'}`}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </aside>
    </>
  );
}
