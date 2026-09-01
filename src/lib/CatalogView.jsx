import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  SlidersHorizontal,
  Package,
  Layers,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Loader2,
  Eye,
  Plus,
} from 'lucide-react';
import { cn } from './utils';
import { searchProducts, getProductFamily, getProductImage, searchImage } from './api';
import ImageLightbox from './ImageLightbox';

const SPECIALTY_OPTIONS = [
  { id: '', label: 'All Specialties' },
  { id: 'Cardio', label: 'Cardio & Thoracic' },
  { id: 'Neurosurgery', label: 'Neurosurgery' },
  { id: 'Plastic Surgery', label: 'Plastic Surgery' },
  { id: 'Other', label: 'General / Other' },
];

export default function CatalogView({
  onSelectProduct,
  addToCart,
  activeCategorySpecialty,
}) {
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState(activeCategorySpecialty || '');
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [searchTime, setSearchTime] = useState(0);
  const [expandedFamily, setExpandedFamily] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [visualSearching, setVisualSearching] = useState(false);
  const [visualPreview, setVisualPreview] = useState(null);

  const fileInputRef = useRef(null);
  const limit = 20; // must match backend settings.search_results_per_page (20)

  useEffect(() => {
    if (activeCategorySpecialty !== undefined) {
      setSpecialty(activeCategorySpecialty || '');
      setPage(1);
    }
  }, [activeCategorySpecialty]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const data = await searchProducts({
        query: query.trim(),
        specialty: specialty || undefined,
        page,
        limit,
      });
      // Backend returns {products, total} (v2) — fallback to items for legacy compat
      setProducts(data.products ?? data.items ?? []);
      setTotal(data.total ?? 0);
      // Use server timing if provided, else client
      setSearchTime(data.search_time_ms ?? Math.round(performance.now() - start));
    } catch (err) {
      console.error('Failed to search catalog:', err);
    } finally {
      setLoading(false);
    }
  }, [query, specialty, page, limit]);

  useEffect(() => {
    const timer = setTimeout(loadData, 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleVisualUpload = async (file) => {
    if (!file) return;
    setVisualSearching(true);
    const previewUrl = URL.createObjectURL(file);
    setVisualPreview(previewUrl);

    try {
      const res = await searchImage(file);
      // Backend returns {products, total} — also handle legacy {candidates}
      const list = res.products ?? res.candidates ?? [];
      if (list.length > 0) {
        setProducts(list.map((c) => c.product || c));
        setTotal(res.total ?? list.length);
        setSearchTime(res.search_time_ms ?? 0);
      }
    } catch (err) {
      console.error('Visual search failed:', err);
    } finally {
      setVisualSearching(false);
    }
  };

  const clearVisual = () => {
    setVisualPreview(null);
    loadData();
  };

  const handleExpandFamily = async (e, p) => {
    e.stopPropagation();
    if (expandedFamily === p.code) {
      setExpandedFamily(null);
      return;
    }
    if (!p.code) return;
    setExpandedFamily(p.code);
    setFamilyLoading(true);
    try {
      const members = await getProductFamily(p.code);
      setFamilyMembers(members);
    } catch (err) {
      console.error('Failed to load family:', err);
    } finally {
      setFamilyLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-mesh">
      {/* Search Header */}
      <div className="p-4 sm:p-6 bg-white border-b border-slate-200 shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Surgical Instrument Catalog
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Browse and search 5,274 verified KLS Martin precision surgical instruments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) handleVisualUpload(f);
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <ImageIcon size={13} className="text-sky-600" />
              <span>Visual Image Match</span>
            </button>
          </div>
        </div>

        {/* Text Input */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by article code (e.g. 13-419-18), instrument name, author, anatomy, or spec…"
            className="w-full pl-10 pr-24 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-sky-600 focus:bg-white focus:ring-2 focus:ring-sky-600/10 transition-all"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setPage(1);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Specialty Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {SPECIALTY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                setSpecialty(opt.id);
                setPage(1);
              }}
              className={cn(
                'px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border',
                specialty === opt.id
                  ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Search Active Banner */}
      {visualPreview && (
        <div className="px-6 py-2 bg-sky-50 border-b border-sky-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <img
              src={visualPreview}
              alt="Visual search reference"
              className="w-8 h-8 rounded-lg object-contain bg-white border border-sky-200 p-0.5"
            />
            <span className="font-semibold text-sky-900">
              Visual feature search active
            </span>
          </div>
          <button
            onClick={clearVisual}
            className="text-xs font-bold text-sky-700 hover:text-sky-900 cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* Catalog Grid Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            {total.toLocaleString()} instruments cataloged ({searchTime}ms)
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-40 cursor-pointer"
              >
                Prev
              </button>
              <span className="font-mono">
                {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 size={24} className="animate-spin text-sky-600" />
            <p className="text-xs font-medium">Loading catalog instruments…</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-24 text-center">
            <Package size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-800">No Instruments Found</p>
            <p className="text-xs text-slate-500 mt-1">
              Try searching for a different code, term, or clearing the specialty filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => {
              const isExpanded = expandedFamily === p.code;

              return (
                <div
                  key={p.code}
                  onClick={() => onSelectProduct?.(p)}
                  className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between shadow-2xs group"
                >
                  <div className="space-y-3">
                    {/* Thumbnail Image */}
                    <div className="w-full h-36 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-center p-2 overflow-hidden relative">
                      {p.has_image ? (
                        <img
                          src={getProductImage(p.code)}
                          alt={p.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <Package size={28} className="text-slate-300" />
                      )}
                      <span className="absolute top-2 left-2 font-mono text-[10px] font-bold bg-white/90 backdrop-blur-xs border border-slate-200 text-slate-800 px-1.5 py-0.2 rounded">
                        {p.code}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400 font-medium">
                        <span>{p.specialty || 'General'}</span>
                        {p.family_id && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-slate-600">{p.family_id}</span>
                          </>
                        )}
                      </div>
                      <h3 className="font-bold text-xs text-slate-900 mt-1 line-clamp-2 leading-snug group-hover:text-sky-700">
                        {p.name}
                      </h3>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                    {p.family_id ? (
                      <button
                        onClick={(e) => handleExpandFamily(e, p)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Layers size={11} />
                        <span>Sizes</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400">Single SKU</span>
                    )}

                    <button
                      onClick={() => addToCart?.(p)}
                      className="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-sky-600 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Plus size={12} strokeWidth={2.5} />
                      <span>Add</span>
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Available Sizes</div>
                      {familyLoading ? (
                        <div className="flex items-center justify-center py-2 text-slate-400">
                          <Loader2 size={14} className="animate-spin" />
                        </div>
                      ) : familyMembers?.variants?.length > 0 ? (
                        familyMembers.variants.map((v) => (
                          <div key={v.code} className="flex items-center justify-between bg-slate-50 p-1.5 rounded hover:bg-slate-100 transition-colors">
                            <div className="flex flex-col min-w-0">
                              <span className="font-mono text-[10px] font-bold text-slate-700">{v.code}</span>
                              <span className="text-[10px] text-slate-500 truncate">{v.name.split(' - ').pop()}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); addToCart?.(v); }} className="p-1.5 rounded-md bg-white border border-slate-200 hover:border-sky-500 hover:text-sky-600 transition-colors shadow-xs ml-2 shrink-0">
                              <Plus size={12} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] text-slate-400 text-center py-1">No variants found</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {lightbox && <ImageLightbox {...lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}