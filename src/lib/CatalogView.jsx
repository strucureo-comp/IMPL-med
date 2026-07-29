import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Image, Loader2, Package } from 'lucide-react';
import { cn } from './utils';
import { searchProducts, searchImage, getProductImage } from './api';

const CATEGORIES = [
  { label: 'All', specialty: null },
  { label: 'Cardio', specialty: 'Cardio' },
  { label: 'Neurosurgery', specialty: 'Neurosurgery' },
  { label: 'Plastic Surgery', specialty: 'Plastic Surgery' },
  { label: 'General / Other', specialty: 'Other' },
];

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function ProductCard({ product, onSelect, onAddToCart }) {
  const hasImage = product.has_image;

  return (
    <div
      className="group cursor-pointer rounded-2xl bg-white border border-stone-100 transition-all duration-300 flex flex-col"
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 0 0 1.5px rgba(200,16,46,0.15), 0 8px 32px rgba(200,16,46,0.08), 0 2px 8px rgba(0,0,0,0.04)';
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = 'rgba(200,16,46,0.12)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = '';
      }}
      onClick={() => onSelect?.(product)}
    >
      <div className="relative overflow-hidden rounded-t-2xl p-6 pb-4" style={{ background: 'linear-gradient(160deg, #fafaf9 0%, #f5f5f4 100%)' }}>
        {hasImage ? (
          <div className="aspect-[4/3] flex items-center justify-center">
            <img
              src={getProductImage(product.code)}
              alt={product.name}
              className="h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="aspect-[4/3] flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-stone-100 to-stone-50 flex items-center justify-center">
              <Package className="h-10 w-10 text-stone-300" strokeWidth={1.2} />
            </div>
          </div>
        )}
        {product.has_image && (
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-400 shadow-sm"></div>
        )}
      </div>
      <div className="px-5 pb-5 pt-4 space-y-2.5 flex flex-col flex-1">
        <h3 className="text-base font-semibold leading-snug text-stone-900 line-clamp-2 min-h-[48px] group-hover:text-brand transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-stone-400 bg-stone-50 px-2.5 py-1 rounded-md">{product.code}</span>
          {product.specialty && (
            <span className="text-[11px] font-medium text-brand/70 bg-brand/5 px-2.5 py-1 rounded-full">{product.specialty}</span>
          )}
        </div>
        {product.article_text && (
          <p className="text-sm text-stone-500 leading-relaxed line-clamp-2 flex-1">{product.article_text}</p>
        )}
        <div className="pt-2 mt-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart?.(product);
            }}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-stone-600 transition-all duration-300 border border-stone-200 hover:bg-brand hover:text-white hover:border-brand hover:shadow-glow active:scale-[0.97]"
            style={{ background: 'rgba(0,0,0,0.02)' }}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CatalogView({ onSelectProduct, addToCart }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [products, setProducts] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTimeMs, setSearchTimeMs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isImageSearching, setIsImageSearching] = useState(false);
  const [error, setError] = useState(null);
  const [isInitial, setIsInitial] = useState(true);
  const [imagePreview, setImagePreview] = useState(null); // object URL of the last image search

  const fileInputRef = useRef(null);
  const searchInputRef = useRef(null);

  // Revoke any live object URL when the component unmounts.
  useEffect(() => {
    return () => {
      setImagePreview((url) => {
        if (url) URL.revokeObjectURL(url);
        return null;
      });
    };
  }, []);

  const clearImagePreview = useCallback(() => {
    setImagePreview((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
  }, []);

  const debouncedQuery = useDebounce(searchQuery, 300);
  const debouncedCategory = useDebounce(activeCategory, 300);

  const hasQuery = searchQuery.trim().length > 0 || debouncedQuery.trim().length > 0;

  const activeSpecialty = CATEGORIES.find((c) => c.label === activeCategory)?.specialty ?? null;

  const fetchProducts = useCallback(async (query, specialty, page) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        query: query || '',
        page,
        show_disabled: false,
      };
      if (specialty) params.specialty = specialty;

      const data = await searchProducts(params);
      setProducts(data.products || []);
      setTotalResults(data.total || 0);
      setTotalPages(data.total_pages || 1);
      setCurrentPage(data.page || 1);
      setSearchTimeMs(data.search_time_ms ?? null);
    } catch (err) {
      setError(err.message || 'Search failed');
      setProducts([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isInitial) return;
    fetchProducts(debouncedQuery, activeSpecialty, 1);
  }, [debouncedQuery, activeSpecialty, isInitial, fetchProducts]);

  useEffect(() => {
    setIsInitial(false);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    clearImagePreview();
    setIsInitial(false);
    fetchProducts(searchQuery, activeSpecialty, 1);
  };

  const handleCategoryChange = (label) => {
    setActiveCategory(label);
    setIsInitial(false);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchProducts(searchQuery, activeSpecialty, page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageSearch = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsImageSearching(true);
    setError(null);
    setProducts([]);
    setSearchQuery('');
    setSearchTimeMs(null);
    setIsInitial(false);

    // Persist a preview of the searched image so it stays visible.
    clearImagePreview();
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    try {
      const data = await searchImage(file, 20);
      setProducts(data.products || []);
      setTotalResults(data.total || 0);
      setTotalPages(1);
      setCurrentPage(1);
      setSearchTimeMs(data.search_time_ms ?? null);
    } catch (err) {
      setError(err.message || 'Image search failed');
    } finally {
      setIsImageSearching(false);
    }
  };

  const handleClearImagePreview = () => {
    clearImagePreview();
    setProducts([]);
    setTotalResults(0);
    setTotalPages(1);
    setSearchTimeMs(null);
    setIsInitial(true);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setIsInitial(false);
  };

  const showResults = !isInitial || loading;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #f5f5f7 0%, #ececec 100%)' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        className={cn(
          'flex flex-col items-center justify-center px-4 transition-all duration-500',
          hasQuery ? 'pt-6 pb-4' : 'min-h-[60vh] pb-8'
        )}
      >
        <div className={cn('w-full max-w-2xl transition-all duration-500', hasQuery && 'max-w-xl')}>
          <div className={cn('text-center transition-all duration-500', hasQuery ? 'mb-4' : 'mb-8')}>
            <h1
              className={cn(
                'font-bold tracking-tight text-gray-900 transition-all duration-500',
                hasQuery ? 'text-lg' : 'text-4xl sm:text-5xl'
              )}
            >
              Surgical Catalog
            </h1>
            {!hasQuery && (
              <p className="mt-2 text-sm text-gray-500">Search 7,000+ surgical instruments</p>
            )}
          </div>

          <form onSubmit={handleSearch} className="relative group rounded-2xl">
            <div className={cn(
              "glow-ring transition-opacity duration-500",
              searchQuery.trim() ? "opacity-100 glow-ring-active" : "opacity-0 group-focus-within:opacity-100"
            )} />
            <div className="relative flex items-center border border-gray-200 rounded-2xl px-5 py-3.5 bg-white/95 shadow-sm transition-all duration-300 group-focus-within:border-[#c8102e]/30 group-focus-within:shadow-[0_0_0_1px_rgba(200,16,46,0.06),0_4px_24px_-8px_rgba(0,0,0,0.1)]">
              {loading || isImageSearching ? (
                <Loader2 className="h-5 w-5 text-gray-400 shrink-0 animate-spin" />
              ) : (
                <Search className="h-5 w-5 text-gray-400 shrink-0" />
              )}
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by product name, code, or category..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsInitial(false);
                }}
                className="flex-1 bg-transparent px-3 text-base text-gray-900 outline-none placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={handleImageSearch}
                disabled={isImageSearching}
                className="shrink-0 rounded-xl border border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <Image className="inline h-4 w-4 mr-1" />
                Image
              </button>
            </div>
          </form>

          <div className="flex flex-wrap justify-center gap-1.5 mt-5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => handleCategoryChange(cat.label)}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium rounded-full transition-all',
                  activeCategory === cat.label
                    ? 'bg-[#c8102e] text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {showResults && (
            <div className="mt-3 text-center text-xs text-gray-400">
              {loading || isImageSearching ? (
                'Searching...'
              ) : (
                <>
                  {totalResults} result{totalResults !== 1 ? 's' : ''}
                  {searchTimeMs != null && ` in ${searchTimeMs.toFixed(0)}ms`}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <section className="mx-auto max-w-7xl px-6 pb-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        </section>
      )}

      {(showResults || products.length > 0) && (
        <section className="mx-auto max-w-7xl px-6 pb-16 lg:px-8">
          {loading || isImageSearching ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-gray-300 animate-spin" />
              <p className="mt-3 text-sm text-gray-400">
                {isImageSearching ? 'Analyzing image...' : 'Searching...'}
              </p>
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <ProductCard
                    key={product.code}
                    product={product}
                    onSelect={onSelectProduct}
                    onAddToCart={addToCart}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 mt-8">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let page;
                    if (totalPages <= 7) {
                      page = i + 1;
                    } else if (currentPage <= 4) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      page = totalPages - 6 + i;
                    } else {
                      page = currentPage - 3 + i;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={cn(
                          'px-3 py-1.5 text-sm rounded-lg transition-all',
                          currentPage === page
                            ? 'bg-[#c8102e] text-white shadow-sm'
                            : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                        )}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            !loading && !isImageSearching && (
              <div className="py-20 text-center text-gray-400">
                <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" strokeWidth={1} />
                <p className="text-sm">No products found matching your criteria.</p>
              </div>
            )
          )}
        </section>
      )}

      {!hasQuery && isInitial && (
        <section className="mx-auto max-w-3xl px-6 pb-16">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Try searching for
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Cranial plates', 'Spinal screws', 'K-wires', 'Bone saws', 'Mesh implants', 'Screwdrivers'].map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestionClick(s)}
                    className="px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-500 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    {s}
                  </button>
                )
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
