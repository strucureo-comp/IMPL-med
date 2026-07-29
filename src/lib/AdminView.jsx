import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, Upload, Package, X, RefreshCw, Filter, ChevronDown, FileSpreadsheet, Database, Image, AlertTriangle, CheckCircle, Sparkles, Box, Archive, Info } from 'lucide-react';
import { cn } from './utils';
import {
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  uploadAdminProductImage,
  adminImport,
  adminReindex,
  getProductImage,
} from './api';

const SPECIALTIES = ['All', 'Neurosurgery', 'Cardio', 'Plastic Surgery', 'Other'];
const tabs = ['Products', 'Import'];

const CSV_COLUMNS = [
  { col: 'code',          type: 'string',  req: true,  example: '1201-10',        note: 'Unique article code' },
  { col: 'name',          type: 'string',  req: true,  example: 'Cranial Plate 2.0mm', note: 'Full product name' },
  { col: 'family_id',     type: 'string',  req: false, example: 'CRANIAL',        note: 'Product family group' },
  { col: 'specialty',     type: 'enum',    req: true,  example: 'Neurosurgery',   note: 'Neurosurgery | Cardio | Plastic Surgery | Other' },
  { col: 'article_text',  type: 'string',  req: false, example: 'Designed for cranial reconstruction...', note: 'Description / article text' },
  { col: 'specifications',type: 'JSON',    req: false, example: '{"material":"Titanium"}', note: 'Key-value spec pairs as JSON string' },
  { col: 'brochure_codes',type: 'string',  req: false, example: 'BC-001,BC-002', note: 'Comma-separated brochure references' },
  { col: 'disabled',      type: 'boolean', req: false, example: 'false',          note: 'true = inactive / hidden from catalog' },
];

const CSV_ROWS = [
  { code: '1201-10', name: 'Cranial Plate 2.0mm', family_id: 'CRANIAL', specialty: 'Neurosurgery', article_text: 'Low-profile titanium plate', specifications: '{"material":"Titanium","thickness":"2.0mm"}', brochure_codes: 'BC-001', disabled: 'false' },
  { code: '1312-06', name: 'Screw 2.0x6mm', family_id: '', specialty: 'General', article_text: 'Cortical bone screw', specifications: '{"length":"6mm","diameter":"2.0mm"}', brochure_codes: '', disabled: 'false' },
];

export default function AdminView({ token }) {
  const [activeTab, setActiveTab]         = useState('Products');
  const [products, setProducts]           = useState([]);
  const [total, setTotal]                 = useState(0);
  const [activeCount, setActiveCount]     = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [searchQuery, setSearchQuery]     = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('All');
  const [showFilterMenu, setShowFilterMenu]   = useState(false);
  const [loading, setLoading]             = useState(false);
  const [showPanel, setShowPanel]         = useState(false);
  const [editingProduct, setEditingProduct]   = useState(null);
  const [formData, setFormData]           = useState({ code: '', name: '', family_id: '', article_text: '', specialty: 'Neurosurgery', brochure_codes: '', disabled: false });
  const [specs, setSpecs]                 = useState([]);
  const [imageFile, setImageFile]         = useState(null);
  const [imagePreview, setImagePreview]   = useState(null);
  const [importResult, setImportResult]   = useState(null);
  const [importing, setImporting]         = useState(false);
  const [reindexing, setReindexing]       = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saveError, setSaveError]         = useState('');
  const [saving, setSaving]               = useState(false);
  const panelRef = useRef(null);

  const loadProducts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = { page, per_page: 20, search: searchQuery || undefined };
      if (filterSpecialty !== 'All') params.specialty = filterSpecialty;
      const data = await getAdminProducts(token, params);
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setActiveCount(data.active_count || 0);
      setInactiveCount(data.inactive_count || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }, [token, page, searchQuery, filterSpecialty]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    if (!showPanel && imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  }, [showPanel, imagePreview]);

  const blankForm = () => ({ code: '', name: '', family_id: '', article_text: '', specialty: 'Neurosurgery', brochure_codes: '', disabled: false });

  const openNewForm = () => {
    setEditingProduct(null);
    setFormData(blankForm());
    setSpecs([]);
    setImageFile(null);
    setImagePreview(null);
    setSaveError('');
    setShowPanel(true);
  };

  const openEditForm = (product) => {
    setEditingProduct(product);
    setFormData({
      code: product.code,
      name: product.name || '',
      family_id: product.family_id || '',
      article_text: product.article_text || '',
      specialty: product.specialty || 'Neurosurgery',
      brochure_codes: product.brochure_codes ? product.brochure_codes.join(', ') : '',
      disabled: product.disabled || false,
    });
    setSpecs(
      product.specifications && typeof product.specifications === 'object'
        ? Object.entries(product.specifications).map(([k, v]) => ({ key: k, value: String(v) }))
        : []
    );
    setImageFile(null);
    setImagePreview(null);
    setSaveError('');
    setShowPanel(true);
  };

  const addSpec = () => setSpecs(prev => [...prev, { key: '', value: '' }]);
  const removeSpec = (index) => setSpecs(prev => prev.filter((_, i) => i !== index));
  const updateSpec = (index, field, val) => setSpecs(prev => prev.map((s, i) => i === index ? { ...s, [field]: val } : s));

  const closePanel = () => setShowPanel(false);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setSaveError('');
    setSaving(true);
    const payload = {
      name: formData.name,
      family_id: formData.family_id,
      article_text: formData.article_text,
      specialty: formData.specialty,
      disabled: formData.disabled,
    };
    const specsObj = {};
    specs.forEach(s => {
      if (s.key.trim()) specsObj[s.key.trim()] = s.value;
    });
    payload.specifications = specsObj;
    payload.brochure_codes = formData.brochure_codes
      ? formData.brochure_codes.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    try {
      if (editingProduct) {
        await updateAdminProduct(token, editingProduct.code, payload);
      } else {
        payload.code = formData.code;
        await createAdminProduct(token, payload);
      }
      if (imageFile && formData.code) {
        try { await uploadAdminProductImage(token, formData.code, imageFile); }
        catch (e) { console.error('Image upload failed:', e); }
      }
      closePanel();
      await loadProducts();
    } catch (err) {
      setSaveError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (code) => {
    try {
      await deleteAdminProduct(token, code);
      setDeleteConfirm(null);
      await loadProducts();
    } catch (err) { console.error('Delete failed:', err); }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await adminImport(token, file);
      setImportResult(result);
      await loadProducts();
    } catch (err) {
      setImportResult({ errors: [err.message] });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try { await adminReindex(token); alert('Reindex complete'); }
    catch (err) { alert(`Reindex failed: ${err.message}`); }
    finally { setReindexing(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-page via-bg-warm to-bg-page">
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-8 animate-in">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center shadow-glow">
                <Sparkles size={14} className="text-white" />
              </div>
              <h1 className="text-xl font-semibold text-text-primary tracking-tight">Admin Panel</h1>
              <span className="px-3 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-brand/10 text-brand">Secure</span>
            </div>
            <p className="text-sm text-text-secondary ml-11">Manage your surgical instrument catalog</p>
          </div>
          {activeTab === 'Products' && (
            <button onClick={openNewForm} className="btn-primary">
              <Plus size={15} />
              Add Product
            </button>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1.5 mb-7 p-1.5 bg-white rounded-2xl shadow-card-strong border border-stone-100 w-fit animate-in">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-5 py-2 text-sm font-medium rounded-xl transition-all duration-300',
                activeTab === tab
                  ? 'bg-brand text-white shadow-glow'
                  : 'text-text-secondary hover:text-text-primary hover:bg-stone-100/80'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Products Tab ── */}
        {activeTab === 'Products' && (
          <>
            {/* Stat cards - soft colored */}
            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-5 mb-7 animate-in">
              <div className="bg-white rounded-3xl p-5 shadow-card-strong border border-stone-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center shadow-glow">
                    <Box size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Total Products</p>
                    <p className="text-2xl font-bold text-text-primary mt-0.5">{total.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-3xl p-5 shadow-card-strong border border-stone-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center shadow-sm">
                    <CheckCircle size={20} className="text-green-vibrant" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Active</p>
                    <p className="text-2xl font-bold text-green-vibrant mt-0.5">{activeCount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-3xl p-5 shadow-card-strong border border-stone-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-stone-200 to-stone-100 flex items-center justify-center shadow-sm">
                    <Archive size={20} className="text-text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Inactive</p>
                    <p className="text-2xl font-bold text-text-muted mt-0.5">{inactiveCount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Table card */}
            <div className="bg-white rounded-3xl shadow-card-strong border border-stone-100 animate-in">

              {/* Toolbar */}
              <div className="px-6 py-4 flex items-center gap-3 border-b border-stone-100/50">
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50/80 rounded-2xl text-sm text-text-primary outline-none focus:bg-white focus:ring-4 focus:ring-brand-glow transition-all duration-300 placeholder:text-text-muted/60"
                  />
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowFilterMenu(v => !v)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300',
                      filterSpecialty !== 'All'
                        ? 'bg-brand/10 text-brand'
                        : 'bg-stone-50/80 text-text-secondary hover:bg-stone-100/80'
                    )}
                  >
                    <Filter size={14} />
                    {filterSpecialty === 'All' ? 'Filter' : filterSpecialty}
                    <ChevronDown size={12} className={cn('transition-transform', showFilterMenu && 'rotate-180')} />
                  </button>
                  {showFilterMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-float z-20 py-2 animate-scale">
                      {SPECIALTIES.map(s => (
                        <button
                          key={s}
                          onClick={() => { setFilterSpecialty(s); setPage(1); setShowFilterMenu(false); }}
                          className={cn(
                            'w-full text-left px-4 py-2.5 text-sm transition-colors',
                            filterSpecialty === s ? 'text-brand font-medium bg-brand/5' : 'text-text-secondary hover:bg-stone-50'
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {filterSpecialty !== 'All' && (
                  <button onClick={() => { setFilterSpecialty('All'); setPage(1); }} className="p-2 rounded-full text-text-muted hover:text-text-secondary hover:bg-stone-100/80 transition-all">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-rose-50/80 to-stone-50/80">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Product</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Category</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Code</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-sm text-text-muted">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw size={14} className="animate-spin" />
                            Loading products...
                          </div>
                        </td>
                      </tr>
                    ) : products.map((p) => (
                      <tr
                        key={p.code}
                        className="cursor-pointer transition-all duration-200 hover:bg-gradient-to-r hover:from-rose-50/40 hover:to-transparent group border-b border-stone-100/30 last:border-b-0"
                        onClick={() => openEditForm(p)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-stone-100 to-stone-50 flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-stone-100">
                              {p.has_image
                                ? <img src={getProductImage(p.code)} alt="" className="w-full h-full object-contain p-1" />
                                : <div className="w-full h-full bg-gradient-to-br from-brand/5 to-brand/10 flex items-center justify-center"><Package size={18} className="text-brand/40" /></div>
                              }
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-text-primary truncate max-w-[260px] group-hover:text-brand transition-colors">{p.name}</p>
                              {p.family_id && <p className="text-xs text-text-muted mt-0.5 truncate">{p.family_id}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-text-secondary">{p.specialty}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-text-muted bg-stone-50/80 px-2.5 py-1 rounded-full">{p.code}</span>
                        </td>
                        <td className="px-6 py-4">
                          {p.disabled ? (
                            <span className="badge-inactive"><span className="w-1.5 h-1.5 rounded-full bg-text-muted" />Inactive</span>
                          ) : (
                            <span className="badge-active"><span className="w-1.5 h-1.5 rounded-full bg-green-vibrant" />Active</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <button onClick={(e) => { e.stopPropagation(); openEditForm(p); }} className="p-2 rounded-full hover:bg-stone-100/80 text-text-muted hover:text-text-primary transition-all" title="Edit">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(p.code); }} className="p-2 rounded-full hover:bg-red-soft text-text-muted hover:text-red-vibrant transition-all" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!loading && products.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-sm text-text-muted">No products found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 flex items-center justify-between border-t border-stone-100/50 bg-stone-50/30 rounded-b-3xl">
                <span className="text-xs text-text-muted">Page {page} of {totalPages} &mdash; {total.toLocaleString()} products</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-4 py-1.5 rounded-full bg-white/80 text-xs text-text-secondary hover:bg-white hover:shadow-soft disabled:opacity-40 disabled:cursor-not-allowed transition-all">Prev</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-4 py-1.5 rounded-full bg-white/80 text-xs text-text-secondary hover:bg-white hover:shadow-soft disabled:opacity-40 disabled:cursor-not-allowed transition-all">Next</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Import Tab ── */}
        {activeTab === 'Import' && (
          <div className="space-y-6 animate-in">

            {/* Upload card */}
            <div className="bg-white rounded-3xl shadow-card-strong border border-stone-100 overflow-hidden">
              <div className="px-6 py-5 bg-gradient-to-r from-rose-50/60 to-transparent flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-100 to-rose-50 flex items-center justify-center">
                  <Upload size={18} className="text-brand" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Bulk Product Import</h3>
                  <p className="text-xs text-text-muted mt-0.5">Upload a CSV or JSON file to add or update products in bulk</p>
                </div>
              </div>
              <div className="p-6">
                <label className="block cursor-pointer">
                  <div className="bg-gradient-to-br from-stone-50 to-white rounded-2xl p-14 text-center hover:from-rose-50/60 hover:to-white transition-all duration-300 group">
                    <input type="file" accept=".csv,.json" className="hidden" onChange={handleImport} disabled={importing} />
                    <div className="w-16 h-16 rounded-full bg-white shadow-soft flex items-center justify-center mx-auto mb-4 group-hover:shadow-glow group-hover:scale-105 transition-all duration-300">
                      <Upload size={24} className="text-text-muted group-hover:text-brand transition-colors" />
                    </div>
                    <p className="text-sm font-medium text-text-primary">
                      {importing ? (
                        <span className="flex items-center justify-center gap-2"><RefreshCw size={14} className="animate-spin" /> Importing...</span>
                      ) : 'Drop CSV or JSON here, or click to browse'}
                    </p>
                    <p className="text-xs text-text-muted mt-1.5">Supports .csv and .json &middot; Max 10 MB</p>
                  </div>
                </label>

                {importResult && (
                  <div className={cn('mt-5 rounded-2xl p-5 text-sm animate-scale', importResult.errors?.length ? 'bg-red-soft' : 'bg-green-soft')}>
                    <p className="font-semibold text-text-primary mb-2 flex items-center gap-2">
                      {importResult.errors?.length ? <AlertTriangle size={14} className="text-red-vibrant" /> : <CheckCircle size={14} className="text-green-vibrant" />}
                      Import Result
                    </p>
                    {importResult.created !== undefined && (
                      <div className="flex gap-5 text-xs">
                        <span className="text-green-vibrant font-medium">&check; Created: {importResult.created}</span>
                        <span className="text-text-secondary">&uarr; Updated: {importResult.updated}</span>
                        <span className="text-text-muted">&mdash; Skipped: {importResult.skipped}</span>
                      </div>
                    )}
                    {importResult.errors?.length > 0 && (
                      <div className="mt-2 text-xs text-red-vibrant space-y-0.5">
                        {importResult.errors.map((e, i) => <p key={i}>{e}</p>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Schema reference - Excel workbook look */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-soft overflow-hidden">
              <div className="px-6 py-5 bg-gradient-to-r from-amber-50/60 to-transparent flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
                  <FileSpreadsheet size={18} className="text-amber-vibrant" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">CSV / JSON Schema Reference</h3>
                  <p className="text-xs text-text-muted mt-0.5">Column format specification &mdash; match these headers in your file</p>
                </div>
              </div>

              {/* Formula bar */}
              <div className="px-6 py-3 bg-[#f3f4f6] border-y border-[#d1d5db] flex items-center gap-3 text-xs">
                <span className="text-[#6b7280] font-semibold min-w-[60px]">Name Box</span>
                <div className="flex-1 bg-white border border-[#d1d5db] rounded px-3 py-1.5 font-mono text-[#374151]">
                  A1: code
                </div>
              </div>

              {/* Excel spreadsheet */}
              <div className="overflow-x-auto">
                <table className="border-collapse min-w-full" style={{ fontSize: '13px' }}>
                  {/* Column headers (A, B, C...) */}
                  <thead>
                    <tr>
                      <th className="w-10 h-7 bg-[#f3f4f6] border border-[#d1d5db] text-[10px] font-semibold text-[#6b7280] text-center sticky left-0 z-10"></th>
                      {CSV_COLUMNS.map((col, i) => (
                        <th key={col.col} className="h-7 bg-[#f3f4f6] border border-[#d1d5db] text-[10px] font-semibold text-[#6b7280] text-center min-w-[120px] px-2 whitespace-nowrap">
                          {String.fromCharCode(65 + i)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Header row - column names */}
                    <tr className="bg-[#e8f4fd]">
                      <td className="w-10 h-7 bg-[#f3f4f6] border border-[#d1d5db] text-[10px] font-semibold text-[#6b7280] text-center sticky left-0 z-10">1</td>
                      {CSV_COLUMNS.map((col, i) => (
                        <td key={col.col} className="h-7 border border-[#d1d5db] px-2 font-bold text-[#111827] bg-[#dbeafe] whitespace-nowrap">
                          {col.col}
                        </td>
                      ))}
                    </tr>
                    {/* Type row */}
                    <tr className="bg-white">
                      <td className="w-10 h-7 bg-[#f3f4f6] border border-[#d1d5db] text-[10px] font-semibold text-[#6b7280] text-center sticky left-0 z-10">2</td>
                      {CSV_COLUMNS.map((col, i) => (
                        <td key={col.col} className="h-7 border border-[#d1d5db] px-2 text-[#6b7280] italic whitespace-nowrap">
                          {col.type}{col.req ? ' *' : ''}
                        </td>
                      ))}
                    </tr>
                    {/* Required row */}
                    <tr className="bg-[#fef3f2]">
                      <td className="w-10 h-7 bg-[#f3f4f6] border border-[#d1d5db] text-[10px] font-semibold text-[#6b7280] text-center sticky left-0 z-10">3</td>
                      {CSV_COLUMNS.map((col, i) => (
                        <td key={col.col} className="h-7 border border-[#d1d5db] px-2 text-center whitespace-nowrap">
                          {col.req ? (
                            <span className="inline-block bg-[#fecaca] text-[#991b1b] text-[10px] font-bold px-1.5 py-0.5 rounded">REQUIRED</span>
                          ) : (
                            <span className="text-[#d1d5db]">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    {/* Example row 1 */}
                    <tr className="bg-white hover:bg-[#f0fdf4] transition-colors">
                      <td className="w-10 h-7 bg-[#f3f4f6] border border-[#d1d5db] text-[10px] font-semibold text-[#6b7280] text-center sticky left-0 z-10">4</td>
                      {CSV_COLUMNS.map((col, i) => (
                        <td key={col.col} className="h-7 border border-[#d1d5db] px-2 font-mono text-[11px] text-[#374151] whitespace-nowrap">
                          {CSV_ROWS[0]?.[col.col] || ''}
                        </td>
                      ))}
                    </tr>
                    {/* Example row 2 */}
                    <tr className="bg-[#f9fafb] hover:bg-[#f0fdf4] transition-colors">
                      <td className="w-10 h-7 bg-[#f3f4f6] border border-[#d1d5db] text-[10px] font-semibold text-[#6b7280] text-center sticky left-0 z-10">5</td>
                      {CSV_COLUMNS.map((col, i) => (
                        <td key={col.col} className="h-7 border border-[#d1d5db] px-2 font-mono text-[11px] text-[#374151] whitespace-nowrap">
                          {CSV_ROWS[1]?.[col.col] || ''}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Column notes below the spreadsheet */}
              <div className="px-6 pb-6 pt-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {CSV_COLUMNS.map((col, i) => (
                    <div key={col.col} className="bg-[#f9fafb] rounded-xl p-3 border border-[#e5e7eb]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold text-[#6b7280] bg-[#e5e7eb] px-1 rounded">{String.fromCharCode(65 + i)}</span>
                        <code className="text-xs font-semibold text-[#c8102e]">{col.col}</code>
                        {col.req && <span className="text-[8px] text-[#c8102e] font-bold">*</span>}
                      </div>
                      <p className="text-[11px] text-[#6b7280] leading-relaxed">{col.note}</p>
                      <code className="text-[10px] text-[#9ca3af] block mt-1 font-mono bg-white px-1.5 py-0.5 rounded border border-[#e5e7eb]">{col.example}</code>
                    </div>
                  ))}
                </div>
              </div>

              {/* JSON hint */}
              <div className="px-6 pb-6 pt-0">
                <div className="rounded-xl bg-[#eff6ff] border border-[#bfdbfe] p-4 flex items-start gap-3">
                  <Info size={14} className="text-[#2563eb] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#374151]">For JSON format, wrap rows in an array: <code className="font-mono bg-white px-1.5 py-0.5 rounded text-[#c8102e] text-[11px] border border-[#e5e7eb]">{'[{"code":"1201-10","name":"..."}]'}</code></p>
                </div>
              </div>
            </div>

            {/* Reindex */}
            <div className="bg-white rounded-3xl shadow-card-strong border border-stone-100 overflow-hidden">
              <div className="px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-stone-100 to-stone-50 flex items-center justify-center">
                    <Database size={18} className="text-text-secondary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Rebuild Search Index</h3>
                    <p className="text-xs text-text-muted mt-0.5">Regenerate the FAISS image-search index after bulk changes</p>
                  </div>
                </div>
                <button onClick={handleReindex} disabled={reindexing} className="btn-secondary">
                  <RefreshCw size={13} className={reindexing ? 'animate-spin' : ''} />
                  {reindexing ? 'Reindexing...' : 'Reindex'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Edit / Add Slide-In Panel ── */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-sm animate-overlay" onClick={closePanel} />
          <div ref={panelRef} className="relative w-full max-w-xl bg-white shadow-modal animate-slide flex flex-col">
            {/* Panel header - gradient */}
            <div className="shrink-0 bg-gradient-to-r from-stone-50 via-white to-stone-50 px-6 py-5 border-b border-stone-200/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm', editingProduct ? 'bg-gradient-to-br from-amber-100 to-amber-50' : 'bg-gradient-to-br from-brand to-brand-hover shadow-glow')}>
                    {editingProduct ? <Edit2 size={18} className="text-amber-vibrant" /> : <Plus size={18} className="text-white" />}
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-text-primary">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                    {editingProduct && <p className="text-xs text-text-muted mt-0.5 font-mono bg-stone-100 px-2 py-0.5 rounded-md inline-block mt-1">{editingProduct.code}</p>}
                  </div>
                </div>
                <button onClick={closePanel} className="p-2.5 rounded-full hover:bg-stone-100 text-text-muted hover:text-text-primary transition-all">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {/* Image - on top, big square */}
              <div className="animate-in">
                <label className="label-field">Product Image</label>
                <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-gradient-to-br from-stone-50 to-white p-6 text-center hover:border-brand/30 hover:from-brand/5 transition-all duration-300 group">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-40 h-40 rounded-2xl bg-white shadow-sm border border-stone-100 flex items-center justify-center overflow-hidden">
                      {imagePreview
                        ? <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                        : editingProduct?.has_image
                          ? <img src={getProductImage(editingProduct.code)} alt="" className="w-full h-full object-contain p-3" />
                          : <Image size={40} className="text-stone-300" />
                      }
                    </div>
                    <div>
                      <label className="cursor-pointer inline-flex items-center gap-2 text-sm font-medium text-brand hover:text-brand-hover transition-colors">
                        <Upload size={14} />
                        {imageFile ? imageFile.name : 'Choose an image'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                      </label>
                      <p className="text-xs text-text-muted mt-1">
                        {imageFile ? `${(imageFile.size / 1024).toFixed(0)} KB uploaded` : 'JPG, PNG or WebP'}
                      </p>
                    </div>
                    {imageFile && (
                      <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="text-xs text-red-vibrant hover:underline">
                        Remove image
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Product details section */}
              <div className="bg-gradient-to-br from-stone-50/80 to-white rounded-2xl p-5 border border-stone-100/60">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand"></div>
                  Product Details
                </h3>

                {!editingProduct && (
                  <div className="mb-4">
                    <label className="label-field">Product Code <span className="text-brand">*</span></label>
                    <input type="text" value={formData.code} onChange={e => setFormData(p => ({ ...p, code: e.target.value }))} className="input-field" placeholder="e.g. 1201-10" />
                  </div>
                )}

                <div className="mb-4">
                  <label className="label-field">Product Name</label>
                  <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="input-field" placeholder="Full product name" />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="label-field">Family ID</label>
                    <input type="text" value={formData.family_id} onChange={e => setFormData(p => ({ ...p, family_id: e.target.value }))} className="input-field" placeholder="e.g. CRANIAL" />
                  </div>
                  <div>
                    <label className="label-field">Specialty</label>
                    <select value={formData.specialty} onChange={e => setFormData(p => ({ ...p, specialty: e.target.value }))} className="input-field">
                      <option>Neurosurgery</option>
                      <option>Cardio</option>
                      <option>Plastic Surgery</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label-field">Description</label>
                  <textarea value={formData.article_text} onChange={e => setFormData(p => ({ ...p, article_text: e.target.value }))} rows={3} className="input-field resize-none" placeholder="Product description..." />
                </div>
              </div>

              {/* Specifications section */}
              <div className="bg-gradient-to-br from-stone-50/80 to-white rounded-2xl p-5 border border-stone-100/60">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-vibrant"></div>
                    Specifications
                  </h3>
                  <button type="button" onClick={addSpec} className="flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-hover transition-colors">
                    <Plus size={13} />
                    Add Field
                  </button>
                </div>

                {specs.length === 0 && (
                  <p className="text-xs text-text-muted text-center py-4">No specifications added yet. Click "Add Field" to begin.</p>
                )}

                <div className="space-y-2.5">
                  {specs.map((spec, i) => (
                    <div key={i} className="flex items-center gap-2 animate-in">
                      <input
                        type="text"
                        value={spec.key}
                        onChange={e => updateSpec(i, 'key', e.target.value)}
                        className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand/30 focus:ring-2 focus:ring-brand/8 transition-all placeholder:text-text-muted/60 font-medium"
                        placeholder="Key (e.g. material)"
                      />
                      <input
                        type="text"
                        value={spec.value}
                        onChange={e => updateSpec(i, 'value', e.target.value)}
                        className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand/30 focus:ring-2 focus:ring-brand/8 transition-all placeholder:text-text-muted/60 font-mono"
                        placeholder="Value (e.g. Titanium)"
                      />
                      <button type="button" onClick={() => removeSpec(i)} className="p-2 rounded-full hover:bg-red-soft text-text-muted hover:text-red-vibrant transition-all shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {specs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-stone-100">
                    <p className="text-[10px] font-mono text-text-muted bg-stone-50 rounded-lg px-3 py-2 break-all">
                      {JSON.stringify(Object.fromEntries(specs.filter(s => s.key.trim()).map(s => [s.key.trim(), s.value])))}
                    </p>
                  </div>
                )}
              </div>

              {/* Brochures section */}
              <div className="bg-gradient-to-br from-stone-50/80 to-white rounded-2xl p-5 border border-stone-100/60">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-vibrant"></div>
                  Brochures
                </h3>
                <div>
                  <label className="label-field">Brochure Codes <span className="text-text-muted font-normal">(comma-separated)</span></label>
                  <input type="text" value={formData.brochure_codes} onChange={e => setFormData(p => ({ ...p, brochure_codes: e.target.value }))} className="input-field" placeholder="BC-001, BC-002" />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button type="button" onClick={() => setFormData(p => ({ ...p, disabled: !p.disabled }))} className={cn('relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-300 focus:outline-none', formData.disabled ? 'bg-stone-200' : 'bg-brand')}>
                  <span className={cn('pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-300', formData.disabled ? 'translate-x-0.5' : 'translate-x-[18px]')} />
                </button>
                <span className="text-sm text-text-secondary">{formData.disabled ? 'Inactive &mdash; hidden from catalog' : 'Active &mdash; visible in catalog'}</span>
              </div>

              {saveError && (
                <div className="text-sm text-red-vibrant bg-red-soft rounded-2xl px-5 py-4 flex items-start gap-3 animate-scale">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <span>{saveError}</span>
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="shrink-0 px-6 py-4 bg-gradient-to-r from-stone-50 to-white border-t border-stone-200/60 flex items-center justify-end gap-3">
              <button onClick={closePanel} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={(!editingProduct && !formData.code) || saving} className="btn-primary">
                {saving ? (
                  <span className="flex items-center gap-2"><RefreshCw size={13} className="animate-spin" /> Saving...</span>
                ) : editingProduct ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-sm animate-overlay" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-modal animate-scale p-8 border border-stone-100">
            <div className="w-12 h-12 rounded-full bg-red-soft flex items-center justify-center mb-4">
              <AlertTriangle size={20} className="text-red-vibrant" />
            </div>
            <h3 className="text-base font-semibold text-text-primary mb-1">Delete Product</h3>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              Are you sure you want to delete <code className="font-mono font-medium text-text-primary bg-stone-100 px-1.5 py-0.5 rounded">{deleteConfirm}</code>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-6 py-2.5 rounded-full bg-red-soft text-red-vibrant font-medium text-sm hover:bg-red-100 transition-all duration-300 active:scale-95">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}