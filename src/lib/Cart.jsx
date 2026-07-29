import { X, Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from './utils';
import { getProductImage } from './api';

export default function Cart({
  items = [],
  total = 0,
  onClose,
  onUpdateQuantity,
  onRemove,
  onClear,
  onCheckout,
}) {
  const subtotal = total;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative h-full w-full max-w-[380px] bg-white shadow-2xl flex flex-col slide-in-right">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Your Cart ({items.length})
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <p className="text-sm">Your cart is empty</p>
            </div>
          )}
          {items.map((item) => {
            const p = item.product;
            const name = p?.name || item.product_code;
            const hasImage = p?.has_image;
            return (
              <div
                key={item.id}
                className="flex gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50"
              >
                <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {hasImage ? (
                    <img
                      src={getProductImage(item.product_code)}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                      No img
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.product_code}</p>
                    </div>
                    <button
                      onClick={() => onRemove(item.product_code)}
                      className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-0 border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => onUpdateQuantity(item.product_code, -1)}
                        className="p-1.5 hover:bg-gray-100 transition-colors text-gray-600"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-sm font-medium text-gray-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.product_code, 1)}
                        className="p-1.5 hover:bg-gray-100 transition-colors text-gray-600"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {items.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-gray-900">
                {items.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Shipping</span>
              <span className="text-gray-400 italic text-xs">
                Calculated at Checkout
              </span>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClear}
                className={cn(
                  'btn-secondary flex-1 text-xs py-2.5'
                )}
              >
                <Trash2 size={14} />
                Clear Cart
              </button>
              <button
                onClick={onCheckout}
                className={cn(
                  'btn-primary flex-1 text-xs py-2.5'
                )}
              >
                Checkout / Download PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
