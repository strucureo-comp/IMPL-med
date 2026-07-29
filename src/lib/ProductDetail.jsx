import { useState } from 'react'
import { X, Minus, Plus } from 'lucide-react'
import { cn } from './utils'
import { getProductImage } from './api'

export default function ProductDetail({ product, onClose, addToCart }) {
  const [quantity, setQuantity] = useState(1)

  const increment = () => setQuantity(q => Math.min(q + 1, 99))
  const decrement = () => setQuantity(q => Math.max(q - 1, 1))

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(product)
    }
    onClose()
  }

  const specs = product.specifications
    ? Object.entries(product.specifications).map(([key, value]) => `${key}: ${value}`)
    : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/10 backdrop-blur-sm animate-overlay" onClick={onClose} />

      <div className="relative z-10 flex w-full max-w-[900px] flex-col overflow-hidden rounded-3xl bg-white shadow-modal animate-scale md:flex-row border border-stone-100">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-text-muted shadow-soft transition hover:text-text-primary hover:bg-stone-50"
        >
          <X size={18} />
        </button>

        <div className="flex items-center justify-center bg-gradient-to-br from-stone-50 to-white p-8 md:w-1/2">
          {product.has_image ? (
            <img
              src={getProductImage(product.code)}
              alt={product.name}
              className="max-h-[400px] w-full object-contain"
            />
          ) : (
            <div className="flex h-[300px] w-full items-center justify-center rounded-2xl bg-stone-100 text-text-muted">
              No image
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-6 md:w-1/2">
          <h2 className="text-2xl font-bold text-text-primary">
            {product.name}
          </h2>
          <p className="text-sm font-mono text-text-muted">{product.code}</p>

          {product.specialty && (
            <p className="text-xs font-medium uppercase tracking-wider text-brand">
              {product.specialty}
            </p>
          )}

          {product.article_text && (
            <p className="text-sm leading-relaxed text-text-secondary">
              {product.article_text}
            </p>
          )}

          {specs.length > 0 && (
            <div className="rounded-xl bg-stone-50 p-3 border border-stone-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">Specifications</p>
              <ul className="space-y-1 text-sm text-text-secondary">
                {specs.map((spec, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-brand/40 shrink-0"></span>
                    {spec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.brochure_codes && product.brochure_codes.length > 0 && (
            <p className="text-xs text-text-muted">
              Brochure: {product.brochure_codes.join(', ')}
            </p>
          )}

          <div className="mt-2 flex items-center gap-4">
            <div className="flex items-center overflow-hidden rounded-xl border border-stone-200">
              <button
                onClick={decrement}
                className="flex h-10 w-10 items-center justify-center text-text-secondary transition hover:bg-stone-50 hover:text-text-primary"
              >
                <Minus size={16} />
              </button>
              <span className="flex h-10 w-12 items-center justify-center border-x border-stone-200 text-sm font-semibold text-text-primary">
                {quantity}
              </span>
              <button
                onClick={increment}
                className="flex h-10 w-10 items-center justify-center text-text-secondary transition hover:bg-stone-50 hover:text-text-primary"
              >
                <Plus size={16} />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              className="flex-1 rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-hover"
            >
              Add to Cart
            </button>
          </div>

          <p className="text-xs text-text-muted">
            For more specifications, refer to the technical datasheet.
          </p>
        </div>
      </div>
    </div>
  )
}