import React, { useEffect, useRef, useState } from 'react';

import { Activity, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Brain, Check, CheckCheck, Clock3, FileSpreadsheet, CircleHelp, HeartPulse, ImagePlus, Layers3, LoaderCircle, Menu, Minus, Package, Plus, RotateCcw, ScanLine, Scissors, Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, Trash2, X } from 'lucide-react';
import { getFamily, imageUrl, safeUrl, search, searchImage } from './api';

import TrayReport from './TrayReport';

import CsvList from './CsvList';

import SearchHelp from './SearchHelp';
import SearchAnimation from './SearchAnimation';


const specialties = [

  { id: 'cardio', name: 'Cardio & thoracic', icon: HeartPulse, sample: 'vascular forceps' },

  { id: 'neurosurgery', name: 'Neurosurgery & spine', icon: Brain, sample: 'Landolt' },

  { id: 'plastic_surgery', name: 'Plastic & reconstructive', icon: Scissors, sample: 'dissecting scissors' },

  { id: 'other_catalog', name: 'General instruments', icon: Activity, sample: 'needle holder' },

];

const emptyFilters = { category: '', author: '', sterility: '', single_use: '', has_image: '' };

const categoryName = id => specialties.find(s => s.id === id)?.name || id || 'Surgical instrument';

function ImplMark() {

  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M7 8v16M14 8v16M21 8v16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /><path d="m21 8 5 5m-5 11 5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>;

}

function readStored(key, fallback) { try { const value = JSON.parse(localStorage.getItem(key)); return Array.isArray(value) ? value : fallback; } catch { return fallback; } }

function useStored(key) {

  const [value, setValue] = useState(() => readStored(key, []));

  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Browsers can disable local storage. */ } }, [key, value]);

  return [value, setValue];

}



function InstrumentImage({ product, variant, className = '' }) {

  const [failed, setFailed] = useState(false);

  const category = variant?.category_slug?.[0] || product.categories?.[0];

  const filename = variant?.image_file || product.image_file;

  const available = variant ? variant.has_image : product.has_image;

  useEffect(() => setFailed(false), [category, filename]);

  return <div className={`instrument-image ${className}`}>

    {available && filename && category && !failed ? <img src={imageUrl(category, filename)} alt={product.base_name} onError={() => setFailed(true)} loading="lazy" /> : <div className="image-placeholder"><Scissors size={38} strokeWidth={1} /><span>Image unavailable</span></div>}

  </div>;

}



function Modal({ children, title, onClose, className = '', feedback = '' }) {

  const ref = useRef(null);

  useEffect(() => {

    const previous = document.activeElement;

    const dialog = ref.current;

    dialog.showModal();

    return () => { dialog.close(); previous?.focus?.(); };

  }, []);

  return <dialog ref={ref} className={`modal ${className}`} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }} aria-label={title}>

    <div className="modal-heading"><div><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></div>{feedback && <div className="inline-success modal-feedback" role="status"><CheckCheck size={18} /><span>{feedback}</span></div>}{children}

  </dialog>;

}



function ProductDetail({ product, onClose, onAdd, tray, onViewTray }) {

  const [data, setData] = useState(null);

  const [error, setError] = useState('');

  const [selected, setSelected] = useState(0);

  const [retry, setRetry] = useState(0);

  const [addedCode, setAddedCode] = useState('');

  const autoSelected = useRef('');

  useEffect(() => {

    const controller = new AbortController();

    setError(''); setData(null); setSelected(0); autoSelected.current = '';

    getFamily(product.family_key, controller.signal).then(setData).catch(e => { if (e.name !== 'AbortError') setError(e.message); });

    return () => controller.abort();

  }, [product.family_key, retry]);

  // Article-level competitor matches name the best compatible article:
  // pre-select it once the family detail loads (one-shot per dialog, the
  // user can still pick any other size afterwards).
  useEffect(() => {

    const code = product.best_match_code;

    if (!code || !data?.variants?.length || autoSelected.current === `${product.family_key}:${code}`) return;

    const index = data.variants.findIndex(v => v.code === code);

    if (index > 0) setSelected(index);

    autoSelected.current = `${product.family_key}:${code}`;

  }, [data, product.best_match_code, product.family_key]);

  const variant = data?.variants?.[selected];

  const added = variant && addedCode === variant.code;

  const quantity = tray.find(item => item.code === variant?.code)?.quantity || 0;

  return <Modal title="Instrument details" onClose={onClose} className="detail-modal">

    <div className="detail-layout"><InstrumentImage product={product} variant={variant} className="detail-image" /><div><span className="eyebrow">{product.family_key} · {categoryName(product.categories?.[0])}</span><h3>{data?.base_name || product.base_name}</h3>

      {error ? <div className="notice error"><p>{error}</p><button className="text-button" onClick={() => setRetry(v => v + 1)}>Try again</button></div> : !data ? <p className="loading-inline"><LoaderCircle className="spin" size={18} /> Loading sizes and specifications…</p> : <>

        <label className="field-label" htmlFor="variant">Select article · {data.variants.length} available</label><select id="variant" value={selected} onChange={e => setSelected(Number(e.target.value))}>{data.variants.map((v, i) => <option key={v.code} value={i}>{v.code} {v.specifications?.['Total length'] ? `— ${v.specifications['Total length']}` : ''}</option>)}</select>

        {variant && <><p className="variant-description">{variant.article_text}</p><dl className="specifications">{Object.entries(variant.specifications || {}).filter(([, v]) => v !== null && v !== '').map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl><div className="detail-tray-actions">{added && <div className="added-feedback" role="status"><span className="added-feedback-icon"><Check size={20} /></span><div><strong>Added to your surgery tray</strong><p>{variant.code} · Quantity in tray: {quantity}</p></div><button className="text-button" onClick={onViewTray}>View tray <ArrowRight size={15} /></button></div>}<button className={`primary-button full ${added ? 'added-button' : ''}`} onClick={() => { onAdd(product, variant); setAddedCode(variant.code); }}>{added ? <CheckCheck size={18} /> : <Plus size={17} />}{added ? 'Added · Add another' : 'Add selected article to tray'}</button></div>{safeUrl(variant.url) && <a className="catalog-link" href={safeUrl(variant.url)} target="_blank" rel="noopener noreferrer">View official catalog <ArrowUpRight size={14} /></a>}</>}

      </>}

    </div></div>

  </Modal>;

}



function ProductCard({ product, onSelect }) {

  const variants = product.variants || [];

  const confidence = Number(product.match_confidence);

  return <article className={`product-card ${product.match_degraded ? 'degraded' : ''}`}>

    <button className="product-open" onClick={() => onSelect(product)}><div className="product-visual"><InstrumentImage product={product} /><span className="article-code">{product.family_key}</span>{product.match_type === 'competitor_resolved' && <span className={`match-label ${product.match_degraded ? 'review' : ''}`}>{product.match_degraded ? 'Review match' : `${Math.round(Math.max(0, Math.min(1, confidence || 0)) * 100)}% match`}</span>}</div><div className="product-copy"><span className="product-category">{categoryName(product.categories?.[0])}</span><h3>{product.base_name}</h3><p>{[...new Set(variants.map(v => v.variant_size).filter(Boolean))].slice(0, 4).join(' · ') || `${product.variant_count || variants.length} available articles`}</p></div></button>

    {product.match_reason && <p className="match-reason">{product.match_reason}</p>}

    {product.best_match_code && <p className="match-reason">Best matching article: {product.best_match_code}</p>}

    <div className="product-footer"><span><Layers3 size={14} /> {product.variant_count || variants.length} variants</span><button onClick={() => onSelect(product)} className="text-button">View details <ArrowUpRight size={15} /></button></div>

  </article>;

}



export default function App() {

  const [query, setQuery] = useState('');

  const [activeQuery, setActiveQuery] = useState('');

  const [filters, setFilters] = useState(emptyFilters);

  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);

  const [data, setData] = useState(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  const [elapsed, setElapsed] = useState(0);

  const [page, setPage] = useState(1);

  const [file, setFile] = useState(null);

  const [preview, setPreview] = useState('');

  const [history, setHistory] = useStored('kls-search-history-v1');

  const [tray, setTray] = useStored('kls-surgery-tray-v1');

  const [trayOpen, setTrayOpen] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);

  const [batchMode, setBatchMode] = useState(false);

  const [batchFile, setBatchFile] = useState(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [selected, setSelected] = useState(null);

  const [health, setHealth] = useState(null);

  const [healthError, setHealthError] = useState(false);

  const [statusOpen, setStatusOpen] = useState(false);

  const [helpOpen, setHelpOpen] = useState(false);

  const [toast, setToast] = useState('');

  const input = useRef(null);

  const upload = useRef(null);

  const csvUpload = useRef(null);

  const controller = useRef(null);

  const currentRequest = useRef(0);

  const filtersRef = useRef(filters);

  filtersRef.current = filters;



  const refreshHealth = async () => {

    setHealthError(false);

    try { const r = await fetch(`${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(8000) }); const value = await r.json(); if (!value.sqlite) throw new Error(); setHealth(value); } catch { setHealth(null); setHealthError(true); }

  };

  useEffect(() => { refreshHealth(); return () => controller.current?.abort(); }, []);

  useEffect(() => { if (!file) { setPreview(''); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);

  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3200); return () => clearTimeout(timer); }, [toast]);

  useEffect(() => { if (!loading) return; const timer = setInterval(() => setElapsed(t => t + 1), 1000); return () => clearInterval(timer); }, [loading]);



  const runSearch = async (text = query, nextFilters = filtersRef.current, nextPage = 1, image = null) => {

    const trimmed = text.trim();

    if (!image && !trimmed) { input.current?.focus(); return; }

    setBatchMode(false);

    controller.current?.abort();

    const id = ++currentRequest.current;

    const ctrl = new AbortController(); controller.current = ctrl;

    setLoading(true); setElapsed(0); setError(''); setData(null); setActiveQuery(image ? image.name : trimmed); setAppliedFilters(nextFilters); setPage(nextPage); setSidebarOpen(false);

    try {

      const result = image ? await searchImage(image, ctrl.signal) : await search(trimmed, nextFilters, nextPage, ctrl.signal);

      if (id !== currentRequest.current) return;

      setData(result);

      if (!image && result.query_type !== 'blocked') setHistory(prev => [{ query: trimmed, category: nextFilters.category, timestamp: Date.now() }, ...prev.filter(h => h.query !== trimmed)].slice(0, 12));

    } catch (e) { if (id === currentRequest.current && e.name !== 'AbortError') setError(e.message === 'Failed to fetch' ? 'Cannot reach the search service. Check that the API is running, then try again.' : e.message); }

    finally { if (id === currentRequest.current) setLoading(false); }

  };

  const cancel = () => { controller.current?.abort(); currentRequest.current++; setLoading(false); setData(null); setError(''); setActiveQuery(''); };

  const reset = () => { cancel(); setBatchMode(false); setQuery(''); setFile(null); setFilters(emptyFilters); setPage(1); setSidebarOpen(false); input.current?.focus(); };

  const chooseCategory = id => {

    setBatchMode(false);

    const next = { ...filters, category: filters.category === id ? '' : id }; setFilters(next); setSidebarOpen(false);

    if (activeQuery && !file && !loading) runSearch(query || activeQuery, next);

  };

  const attach = image => {

    if (!image) return;

    if (/\.csv$/i.test(image.name)) { importCsv(image); return; }

    if (!image.type.startsWith('image/')) { setToast('Choose an image file to run a visual search.'); return; }

    if (image.size > 10 * 1024 * 1024) { setToast('Choose an image smaller than 10 MB.'); return; }

    cancel(); setBatchMode(false); setFile(image);

  };

  const importCsv = incoming => {

    if (!incoming || !(incoming instanceof File)) { csvUpload.current?.click(); return; }

    cancel(); setFile(null); setFiltersOpen(false); setBatchFile(incoming); setBatchMode(true);

  };

  const addBatchToTray = articles => {

    const combined = new Map();

    articles.forEach(article => {

      const previous = combined.get(article.code);

      combined.set(article.code, { ...article, quantity: (previous?.quantity || 0) + article.quantity });

    });

    const next = tray.map(article => combined.has(article.code) ? { ...article, quantity: article.quantity + combined.get(article.code).quantity } : article);

    combined.forEach(article => { if (!tray.some(existing => existing.code === article.code)) next.push(article); });

    if (next.some(article => !Number.isSafeInteger(article.quantity))) throw new Error('The combined quantity is too large. Reduce quantities before adding this list.');

    setTray(next);

  };

  const addToTray = (product, variant) => {

    setTray(prev => { const existing = prev.find(i => i.code === variant.code); return existing ? prev.map(i => i.code === variant.code ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, { code: variant.code, name: product.base_name, size: variant.specifications?.['Total length'] || variant.variant_size || '', category: product.categories?.[0] || '', quantity: 1, family_key: product.family_key, url: safeUrl(variant.url) || '', has_image: variant.has_image ?? product.has_image, image_file: variant.image_file || product.image_file, image_category: variant.category_slug?.[0] || product.categories?.[0] }]; });

    setToast(`${variant.code} added to your surgery tray`);

  };

  const updateQuantity = (code, change) => setTray(prev => prev.map(i => i.code === code ? { ...i, quantity: i.quantity + change } : i).filter(i => i.quantity > 0));

  const exportTray = () => {

    const cell = value => { const text = String(value); return `"${(/^[=+\-@\t\r]/.test(text) ? "'" : '') + text.replaceAll('"', '""')}"`; };

    const rows = [['Article code', 'Instrument', 'Size', 'Specialty', 'Quantity', 'Catalog URL'], ...tray.map(i => [i.code, i.name, i.size, categoryName(i.category), i.quantity, i.url])];

    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' }));

    const a = document.createElement('a'); a.href = url; a.download = 'impl-surgery-tray.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);

    setToast('Surgery tray exported');

  };

  const totalItems = tray.reduce((sum, i) => sum + i.quantity, 0);

  const filterCount = Object.values(filters).filter(Boolean).length;

  const hasResults = Boolean(data?.results?.length);

  const totalPages = Math.max(1, Math.ceil((data?.pagination?.total ?? data?.total ?? 0) / (data?.pagination?.per_page || 20)));

  const ready = health?.sqlite?.ok && health?.typesense?.ok;



  return <div className="app-shell">

    <header className="top-header"><div className="brand-group"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><button className="brand" onClick={reset} aria-label="IMPL home"><span className="brand-symbol"><ImplMark /></span><span>IMPL</span></button></div>

      <div className="header-actions"><button className="help-button" onClick={() => setHelpOpen(true)} aria-label="Help and CSV format" title="Search help and CSV format"><CircleHelp size={18} /><span>Help</span></button><button className="connection" onClick={() => setStatusOpen(true)}><span className={`status-dot ${ready ? 'ready' : healthError ? 'offline' : ''}`} /><span>{ready ? 'Connected' : healthError ? 'Service offline' : health ? 'Service limited' : 'Connecting'}</span></button><button className={`tray-button ${trayOpen ? 'active' : ''}`} onClick={() => setTrayOpen(!trayOpen)} aria-label={`Open surgery tray, ${totalItems} items`}><ShoppingBag size={18} /><span className="tray-label">Surgery tray</span><span className="tray-count">{totalItems}</span></button></div>

    </header>

    <div className="workspace">

      {sidebarOpen && <button className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}><div className="sidebar-top"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button></div><button className="new-search" onClick={reset}><Plus size={17} /> New instrument search <span>↗</span></button>

        <div className="sidebar-section"><span className="eyebrow">SPECIALTIES</span><button className={`specialty-button ${!filters.category ? 'active' : ''}`} onClick={() => { const next = { ...filters, category: '' }; setFilters(next); if (activeQuery && !file) runSearch(query || activeQuery, next); }}><Layers3 size={17} /> All specialties <span className="selection-dot" /></button>{specialties.map(({ id, name, icon: Icon }) => <button key={id} className={`specialty-button ${filters.category === id ? 'active' : ''}`} onClick={() => chooseCategory(id)}><Icon size={17} />{name}{filters.category === id && <Check size={14} />}</button>)}</div>

        <div className="sidebar-section history-section"><div className="section-heading"><span className="eyebrow">RECENT SEARCHES</span>{history.length > 0 && <button className="icon-button" onClick={() => setHistory([])} aria-label="Clear recent searches"><Trash2 size={13} /></button>}</div>{history.length ? history.map(h => <button className="history-item" key={h.query} onClick={() => { const next = { ...emptyFilters, category: h.category || '' }; setQuery(h.query); setFile(null); setFilters(next); runSearch(h.query, next); }}><Clock3 size={14} /><span>{h.query}</span><ArrowUpRight size={12} /></button>) : <p className="history-empty">No recent searches.</p>}</div>

      </aside>

      <main className={`main-content ${activeQuery ? 'with-results' : ''}`}>

        <div className="page-context"><span><span className="context-icon"><ScanLine size={16} /></span>Instrument search<span className="context-slash">/</span>{filters.category ? categoryName(filters.category) : 'All specialties'}</span><span className="workspace-tag"><span /> KLS Martin catalog</span></div>

        <div className={`search-workspace ${activeQuery || batchMode ? 'compact' : ''}`}>

          {!activeQuery && !batchMode && <section className="hero"><div className="hero-copy"><h1>Search instruments</h1><div className="hero-catalog"><span className="catalog-emblem"><BookOpen size={16} /></span><span>{health?.sqlite?.products ? <><strong>{health.sqlite.products.toLocaleString()}</strong> catalog articles</> : 'Original catalog articles'}</span></div></div><figure className="instrument-showcase"><div className="showcase-heading"><span>FEATURED INSTRUMENT</span><ScanLine size={17} /></div><div className="showcase-stage"><span className="measurement-rule" /><img src="/instruments/metzenbaum.png" alt="Metzenbaum curved dissecting scissors from the KLS Martin catalog" /><span className="spec-label"><span /> Curved pattern</span><span className="length-label">18 cm</span></div><figcaption><div><span className="showcase-code">11-285-18-07</span><strong>Metzenbaum dissecting scissors</strong><span>KLS Martin · Curved · 18 cm</span></div><button aria-label="Search the spotlight instrument" onClick={() => { setQuery('11-285'); setFile(null); runSearch('11-285'); }}><ArrowUpRight size={18} /></button></figcaption></figure></section>}

          <form className={`search-dock ${loading ? 'is-loading' : ''}`} onSubmit={e => { e.preventDefault(); runSearch(query, filters, 1, file); }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); attach(e.dataTransfer.files[0]); }}>

            {file && <div className="attachment"><img src={preview} alt="Image selected for matching" /><div><strong>{file.name}</strong><span>Visual match · {(file.size / 1024 / 1024).toFixed(1)} MB</span></div><button type="button" className="icon-button" onClick={() => { setFile(null); cancel(); }} aria-label="Remove image"><X size={16} /></button></div>}

            <div className="search-input-row"><Search size={22} strokeWidth={1.5} /><input ref={input} aria-label="Search instruments" value={query} onChange={e => setQuery(e.target.value)} placeholder={file ? 'Image ready to search' : 'Search by instrument name or article code…'} disabled={loading || Boolean(file)} onPaste={e => { const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/')); if (item) { e.preventDefault(); attach(item.getAsFile()); } }} /><button className="search-submit" type={loading ? 'button' : 'submit'} onClick={loading ? e => { e.preventDefault(); cancel(); } : undefined} disabled={!loading && !query.trim() && !file} aria-label={loading ? 'Cancel search' : 'Find instruments'}>{loading ? <X size={20} /> : <ArrowRight size={21} />}</button></div>

            <div className="dock-footer"><div className="dock-tools"><button type="button" onClick={() => upload.current?.click()} disabled={loading}><ImagePlus size={16} /> Add image</button><span /><button type="button" onClick={() => { setBatchMode(true); csvUpload.current?.click(); }} disabled={loading}><FileSpreadsheet size={16} /> Import list</button><span /><button type="button" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen}><SlidersHorizontal size={15} /> Filters {filterCount > 0 && <span className="filter-count">{filterCount}</span>}</button></div><span className="enter-hint">{file ? 'Image matching' : <>Press <kbd>↵</kbd> to search</>}</span></div>

            <input ref={upload} type="file" accept="image/*" hidden onChange={e => { attach(e.target.files?.[0]); e.target.value = ''; }} />

            <input ref={csvUpload} type="file" accept=".csv,text/csv" aria-label="Upload CSV list" hidden onChange={e => { importCsv(e.target.files?.[0]); e.target.value = ''; }} />

          </form>

          {filtersOpen && !batchMode && <section className="filter-panel" aria-label="Search filters"><div className="filter-panel-heading"><strong>Refine your search</strong><button className="text-button" onClick={() => setFilters(emptyFilters)}>Reset filters</button></div><div className="filter-fields"><label>Specialty<select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}><option value="">All specialties</option>{specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Author<input placeholder="e.g. Landolt" value={filters.author} onChange={e => setFilters({ ...filters, author: e.target.value })} /></label><label>Sterility<input placeholder="Exact catalog value" value={filters.sterility} onChange={e => setFilters({ ...filters, sterility: e.target.value })} /></label><label>Single use<input placeholder="Exact catalog value" value={filters.single_use} onChange={e => setFilters({ ...filters, single_use: e.target.value })} /></label><label>Product images<select value={filters.has_image} onChange={e => setFilters({ ...filters, has_image: e.target.value })}><option value="">All instruments</option><option value="true">With images</option><option value="false">Without images</option></select></label></div>{file && <p className="filter-note">Filters apply to text searches. Image matching uses visual similarity.</p>}<button className="primary-button" disabled={loading || Boolean(file) || !query.trim()} onClick={() => { setFiltersOpen(false); runSearch(query, filters); }}>Apply filters <ArrowRight size={15} /></button></section>}

          {!activeQuery && !batchMode && <><div className="suggestions"><span>Try a search</span>{['Metzenbaum scissors', '11-285', 'Aesculap needle holder'].map(s => <button key={s} onClick={() => { setQuery(s); setFile(null); runSearch(s); }}>{s}<ArrowUpRight size={12} /></button>)}</div></>}

        </div>

        {!batchMode && batchFile && <button className="csv-return" onClick={() => { cancel(); setBatchMode(true); }}><FileSpreadsheet size={18} /><span><strong>Return to your imported list</strong><small>{batchFile.name}</small></span><ArrowRight size={17} /></button>}

        <CsvList file={batchFile} active={batchMode} onPick={importCsv} onOrdinarySearch={() => { setBatchMode(false); input.current?.focus(); }} onAdd={addBatchToTray} onViewTray={() => setTrayOpen(true)} />

        {!activeQuery && !batchMode && <section className="discovery-section"><div className="discovery-heading"><div><h2>Browse specialties</h2></div></div><div className="specialty-cards">{specialties.map(({ id, name, sample, icon: Icon }) => <button key={id} className={`specialty-card specialty-${id}`} onClick={() => { const next = { ...emptyFilters, category: id }; setFilters(next); setQuery(sample); setFile(null); runSearch(sample, next); }}><div className="specialty-card-top"><span><Icon size={23} strokeWidth={1.5} /></span><ArrowUpRight size={17} /></div><h3>{name}</h3></button>)}</div></section>}

        {loading && !batchMode && <section className="search-state" role="status"><SearchAnimation /><h2>{file ? 'Finding visual matches' : 'Searching the instrument catalog'}</h2>{elapsed >= 7 && <p>{file ? 'Visual search may take a minute to start.' : 'Cross-reference searches can take up to 30 seconds.'}</p>}<button className="text-button" onClick={cancel}>Cancel search</button></section>}
        {error && !batchMode && <section className="search-state error-state" role="alert"><Package size={30} /><h2>Search is unavailable</h2><p>{error}</p><button className="primary-button" onClick={() => runSearch(query || activeQuery, filters, page, file)}><RotateCcw size={15} /> Try again</button></section>}

        {data && !batchMode && <section className="results-section" aria-label="Search results" aria-live="polite">

          {data.query_type === 'competitor' && <div className="notice competitor"><span className="notice-icon"><Sparkles size={18} /></span><div><strong>{data.competitor_context?.brand ? `${data.competitor_context.brand} cross-reference` : 'Competitor cross-reference'}</strong><p>{data.message || 'Showing KLS Martin equivalents for your reference.'}</p>{data.competitor_context?.source_urls?.length > 0 && <div className="source-links">{data.competitor_context.source_urls.filter(safeUrl).map((url, i) => <a key={url} href={safeUrl(url)} target="_blank" rel="noopener noreferrer">Reference {i + 1} <ArrowUpRight size={12} /></a>)}</div>}</div></div>}

          {data.suggestion && <div className="notice suggestion"><ShieldCheck size={18} /><p>{data.suggestion}</p></div>}

          {hasResults && <><div className="results-heading"><div>{data.source === 'image' && <span className="eyebrow">VISUAL SEARCH</span>}<h2>{data.total?.toLocaleString()} instrument {data.total === 1 ? 'family' : 'families'}<span>for “{activeQuery}”</span></h2></div></div>{data.source !== 'image' && <div className="facet-pills"><button className={!filters.category ? 'active' : ''} onClick={() => { const next = { ...filters, category: '' }; setFilters(next); runSearch(query || activeQuery, next); }}>All specialties</button>{(data.facets?.category_slug || []).map(f => <button key={f.value} className={filters.category === f.value ? 'active' : ''} onClick={() => chooseCategory(f.value)}>{categoryName(f.value)}<span>{f.count}</span></button>)}</div>}<div className="results-grid">{data.results.map(p => <ProductCard key={p.family_key} product={p} onSelect={setSelected} />)}</div>{data.source !== 'image' && totalPages > 1 && <div className="pagination"><span>Page {page} of {totalPages}</span><div><button className="secondary-button" disabled={page <= 1} onClick={() => runSearch(activeQuery, appliedFilters, page - 1)}><ArrowLeft size={14} /> Previous</button><button className="secondary-button" disabled={page >= totalPages} onClick={() => runSearch(activeQuery, appliedFilters, page + 1)}>Next <ArrowRight size={14} /></button></div></div>}</>}

          {!hasResults && <div className="search-state"><Search size={34} strokeWidth={1.4} /><h2>{data.query_type === 'blocked' ? 'Add an instrument name or article code' : 'No instruments found'}</h2><p>{data.message || (data.query_type === 'blocked' ? 'Try an instrument name, a catalog code like 11-285, or a more specific description.' : 'Try a different name, article code, or fewer filters.')}</p><button className="secondary-button" onClick={reset}>Start a new search <ArrowRight size={15} /></button></div>}

        </section>}

      </main>

    </div>

    {selected && <ProductDetail product={selected} onClose={() => setSelected(null)} onAdd={addToTray} tray={tray} onViewTray={() => { setSelected(null); setTrayOpen(true); }} />}

    {reportOpen && <Modal title="Export your tray as PDF" className="report-modal" onClose={() => setReportOpen(false)}><TrayReport items={tray} onBack={() => { setReportOpen(false); setTrayOpen(true); }} onDownloaded={() => setToast('PDF report downloaded')} /></Modal>}

    {trayOpen && <Modal title="Your surgery tray" className="tray-modal" onClose={() => setTrayOpen(false)} feedback={toast}><div className="tray-intro"><span>{totalItems} instruments · {tray.length} articles</span><span>Saved on this browser</span></div>{tray.length ? <><div className="tray-items">{tray.map(i => <div className="tray-item" key={i.code}><div><span className="eyebrow">{i.code}</span><h3>{i.name}</h3><p>{i.size || categoryName(i.category)}</p></div><div className="quantity-controls"><button onClick={() => updateQuantity(i.code, -1)} aria-label={`Decrease quantity of ${i.code}`}><Minus size={13} /></button><span>{i.quantity}</span><button onClick={() => updateQuantity(i.code, 1)} aria-label={`Increase quantity of ${i.code}`}><Plus size={13} /></button></div><button className="icon-button" onClick={() => setTray(prev => prev.filter(v => v.code !== i.code))} aria-label={`Remove ${i.code}`}><Trash2 size={16} /></button></div>)}</div><div className="tray-footer"><button className="text-button" onClick={() => setTray([])}><Trash2 size={14} /> Clear tray</button><div className="tray-export-actions"><button className="secondary-button" onClick={exportTray}><ArrowDownToLine size={15} /> Export CSV</button><button className="primary-button" onClick={() => { setTrayOpen(false); setReportOpen(true); setToast(''); }}><ArrowDownToLine size={16} /> Export PDF</button></div></div></> : <div className="search-state"><ShoppingBag size={38} strokeWidth={1.3} /><h3>Your tray is empty.</h3><p>Choose an article in instrument details to add it.</p><button className="primary-button" onClick={() => setTrayOpen(false)}>Find instruments <ArrowRight size={15} /></button></div>}</Modal>}

    {statusOpen && <Modal title="Search service status" onClose={() => setStatusOpen(false)}><div className="status-list">{[['Catalog database', health?.sqlite?.ok, health?.sqlite?.products ? `${health.sqlite.products.toLocaleString()} articles` : 'Article data and specifications'], ['Text search', health?.typesense?.ok, 'Instrument search and cross-references'], ['Visual matching', health?.image_search?.ok, health?.image_search?.mode === 'on-demand' ? 'Ready · loads when you search by image' : 'Search by instrument photograph']].map(([name, ok, caption]) => <div key={name}><div><strong>{name}</strong></div><span className={ok ? 'available' : 'unavailable'}>{ok ? 'Available' : name === 'Visual matching' && health?.image_search?.mode === 'on-demand' ? 'On demand' : health || healthError ? 'Unavailable' : 'Checking'}</span></div>)}</div><button className="secondary-button" onClick={refreshHealth}><RotateCcw size={15} /> Refresh status</button></Modal>}

    {helpOpen && <Modal title="Search help & CSV format" className="help-modal" onClose={() => setHelpOpen(false)}><SearchHelp /></Modal>}

    {toast && !selected && !trayOpen && !reportOpen && !statusOpen && !helpOpen && <div className="toast" role="status"><CheckCheck size={17} /><span>{toast}</span><button onClick={() => setToast('')} aria-label="Dismiss notification"><X size={15} /></button></div>}

  </div>;

}

