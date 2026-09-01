import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Package,
  X,
  RefreshCw,
  Filter,
  ChevronDown,
  FileSpreadsheet,
  Database,
  Image,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Box,
  Archive,
  Info,
  Link2,
  Layers,
  ShieldCheck,
  Copy,
} from 'lucide-react';
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
  listMappings,
  confirmMapping,
  deleteMapping,
} from './api';

const SPECIALTIES = ['All', 'Neurosurgery', 'Cardio', 'Plastic Surgery', 'Other'];
const TABS = ['Products', 'Import', 'Mappings'];

const CSV_COLUMNS = [
  { col: 'code', type: 'string', req: true, example: '1201-10', note: 'Unique article code' },
  { col: 'name', type: 'string', req: true, example: 'Cranial Plate 2.0mm', note: 'Full product name' },
  { col: 'family_id', type: 'string', req: false, example: 'CRANIAL', note: 'Product family group' },
  { col: 'specialty', type: 'enum', req: true, example: 'Neurosurgery', note: 'Neurosurgery | Cardio | Plastic Surgery | Other' },
  { col: 'article_text', type: 'string', req: false, example: 'Designed for cranial reconstruction...', note: 'Description / article text' },
  { col: 'specifications', type: 'JSON', req: false, example: '{"material":"Titanium"}', note: 'Key-value spec pairs as JSON string' },
  { col: 'brochure_codes', type: 'string', req: false, example: 'BC-001,BC-002', note: 'Comma-separated brochure references' },
  { col: 'disabled', type: 'boolean', req: false, example: 'false', note: 'true = inactive / hidden from catalog' },
];

const CSV_ROWS = [
  {
    code: '1201-10',
    name: 'Cranial Plate 2.0mm',
    family_id: 'CRANIAL',
    specialty: 'Neurosurgery',
    article_text: 'Low-profile titanium plate',
    specifications: '{"material":"Titanium","thickness":"2.0mm"}',
    brochure_codes: 'BC-001',
    disabled: 'false',
  },
  {
    code: '1312-06',
    name: 'Screw 2.0x6mm',
    family_id: '',
    specialty: 'General',
    article_text: 'Cortical bone screw',
    specifications: '{"length":"6mm","diameter":"2.0mm"}',
    brochure_codes: '',
    disabled: 'false',
  },
];

export default function AdminView({ token, onLogout, onGoBack }) {
  const [activeTab, setActiveTab] = useState('Products');
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('All');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    family_id: '',
    article_text: '',
    specialty: 'Neurosurgery',
    brochure_codes: '',
    disabled: false,
  });
  const [specs, setSpecs] = useState([]);
  const [imageFile, setImageFile]         = useState(null);
  const [imagePreview, setImagePreview]   = useState(null);
  const [importResult, setImportResult]   = useState(null);
  const [importing, setImporting]         = useState(false);
  const [reindexing, setReindexing]       = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saveError, setSaveError]         = useState('');
  const [saving, setSaving]               = useState(false);
  const [mappings, setMappings]           = useState([]);
  const [mappingStats, setMappingStats]   = useState({
    identifications: 0,
    mappings: 0,
    explicit_confirmations: 0,
  });
  const [mappingSearch, setMappingSearch] = useState('');
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingForm, setMappingForm] = useState({
    competitor_code: '',
    competitor_name: '',
    competitor_manufacturer: '',
    impl_code: '',
    note: '',
  });
  const [mappingError, setMappingError] = useState('');
  const [mappingSaving, setMappingSaving] = useState(false);

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

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const blankForm = () => ({
    code: '',
    name: '',
    family_id: '',
    article_text: '',
    specialty: 'Neurosurgery',
    brochure_codes: '',
    disabled: false,
  });

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

  const openCloneForm = (product) => {
    setEditingProduct(null); // It's a new product, not editing
    setFormData({
      code: product.code + '-VAR',
      name: product.name || '',
      family_id: product.family_id || product.code, // group as variant
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

  const addSpec = () => setSpecs((prev) => [...prev, { key: '', value: '' }]);
  const removeSpec = (index) => setSpecs((prev) => prev.filter((_, i) => i !== index));
  const updateSpec = (index, field, val) =>
    setSpecs((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: val } : s)));

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
    specs.forEach((s) => {
      if (s.key.trim()) specsObj[s.key.trim()] = s.value;
    });
    payload.specifications = specsObj;
    payload.brochure_codes = formData.brochure_codes
      ? formData.brochure_codes.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    try {
      if (editingProduct) {
        await updateAdminProduct(token, editingProduct.code, payload);
      } else {
        payload.code = formData.code;
        await createAdminProduct(token, payload);
      }
      if (imageFile && formData.code) {
        try {
          await uploadAdminProductImage(token, formData.code, imageFile);
        } catch (e) {
          console.error('Image upload failed:', e);
        }
      }
      setShowPanel(false);
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
    } catch (err) {
      console.error('Delete failed:', err);
    }
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
    try {
      await adminReindex(token);
      alert('FAISS & FTS Search Index successfully regenerated.');
    } catch (err) {
      alert(`Reindex failed: ${err.message}`);
    } finally {
      setReindexing(false);
    }
  };

  const loadMappings = useCallback(async () => {
    setMappingLoading(true);
    try {
      const data = await listMappings(mappingSearch, 100);
      setMappings(data.mappings || []);
      setMappingStats(data.stats || { identifications: 0, mappings: 0, explicit_confirmations: 0 });
    } catch (err) {
      console.error('Failed to load mappings:', err);
    } finally {
      setMappingLoading(false);
    }
  }, [mappingSearch]);

  useEffect(() => {
    if (activeTab === 'Mappings') loadMappings();
  }, [activeTab, loadMappings]);

  const handleConfirmMapping = async (e) => {
    e.preventDefault();
    setMappingError('');
    if (!mappingForm.impl_code.trim()) {
      setMappingError('IMPL code is required');
      return;
    }
    if (!mappingForm.competitor_code.trim() && !mappingForm.competitor_name.trim()) {
      setMappingError('Provide a competitor code or name');
      return;
    }
    setMappingSaving(true);
    const payload = { impl_code: mappingForm.impl_code.trim() };
    if (mappingForm.competitor_code.trim()) payload.competitor_code = mappingForm.competitor_code.trim();
    if (mappingForm.competitor_name.trim()) payload.competitor_name = mappingForm.competitor_name.trim();
    if (mappingForm.competitor_manufacturer.trim())
      payload.competitor_manufacturer = mappingForm.competitor_manufacturer.trim();
    if (mappingForm.note.trim()) payload.note = mappingForm.note.trim();
    try {
      await confirmMapping(token, payload);
      setMappingForm({
        competitor_code: '',
        competitor_name: '',
        competitor_manufacturer: '',
        impl_code: '',
        note: '',
      });
      await loadMappings();
    } catch (err) {
      setMappingError(err.message || 'Failed to confirm mapping');
    } finally {
      setMappingSaving(false);
    }
  };

  const handleDeleteMapping = async (code) => {
    try {
      await deleteMapping(token, code);
      await loadMappings();
    } catch (err) {
      console.error('Delete mapping failed:', err);
    }
  };


  return (
    <div className="flex h-screen w-full bg-zinc-950 overflow-hidden text-zinc-900 font-sans">
      {/* Dark Sidebar */}
      <div className="w-64 bg-zinc-950 flex flex-col border-r border-zinc-800 shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-white font-bold text-[13px] tracking-wide">
            <Box size={16} className="text-indigo-500" />
            IMPL ADMIN HUB
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="px-3 text-[10px] font-bold tracking-wider text-zinc-500 uppercase mb-2">Management</p>
          {[
            { id: 'Products', icon: Package, label: 'Inventory' },
            { id: 'Import', icon: Upload, label: 'Batch Import' },
            { id: 'Mappings', icon: Link2, label: 'Competitor Mappings' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                activeTab === item.id 
                  ? "bg-indigo-500/10 text-indigo-400" 
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              )}
            >
              <item.icon size={14} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800 space-y-1">
          <button onClick={onGoBack} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors cursor-pointer">
            <Layers size={14} />
            Back to Client
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors cursor-pointer">
            <X size={14} />
            Logout Session
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 bg-white md:rounded-l-xl border-l border-zinc-200 relative overflow-hidden">
        {/* Top Header */}
        <header className="h-16 px-8 flex items-center justify-between border-b border-zinc-200 bg-white/80 backdrop-blur-md z-10 shrink-0">
          <h2 className="text-sm font-bold text-zinc-900">{activeTab} Management</h2>
          <div className="flex items-center gap-3">
             {activeTab === 'Products' && (
                <button onClick={openNewForm} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-950 text-white text-[11px] font-bold rounded shadow-xs transition-colors cursor-pointer uppercase tracking-wide">
                  <Plus size={12} /> Add Product
                </button>
             )}
             <button onClick={handleReindex} disabled={reindexing} className={cn("flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded transition-colors cursor-pointer border shadow-xs", reindexing ? "bg-zinc-100 text-zinc-400 border-zinc-200" : "bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200")}>
               <RefreshCw size={12} className={cn(reindexing && "animate-spin")} />
               {reindexing ? 'Reindexing...' : 'Sync AI Index'}
             </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-zinc-50/50 relative">
          <div className="max-w-5xl mx-auto space-y-6">

            {activeTab === 'Products' && (
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search by name, code, or family..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow"
                    />
                  </div>
                  <div className="relative">
                    <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <select
                      value={filterSpecialty}
                      onChange={(e) => setFilterSpecialty(e.target.value)}
                      className="pl-9 pr-8 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-900 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow cursor-pointer"
                    >
                      {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50/50 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                          <th className="px-5 py-3">Product</th>
                          <th className="px-5 py-3">Specialty</th>
                          <th className="px-5 py-3">Code</th>
                          <th className="px-5 py-3 text-center">Status</th>
                          <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 text-[13px]">
                        {loading ? (
                          <tr><td colSpan={5} className="px-5 py-8 text-center text-zinc-400">Loading products...</td></tr>
                        ) : products.map(p => (
                          <tr key={p.code} className="hover:bg-zinc-50/50 transition-colors group">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                                  {p.has_image ? (
                                    <img src={getProductImage(p.code)} alt="" className="w-full h-full object-contain p-0.5" />
                                  ) : (
                                    <Package size={14} className="text-zinc-300" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold text-zinc-900 max-w-[250px] truncate">{p.name}</p>
                                  {p.family_id && <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{p.family_id}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-zinc-500 font-medium">{p.specialty}</td>
                            <td className="px-5 py-3"><span className="font-mono text-xs font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded">{p.code}</span></td>
                            <td className="px-5 py-3 text-center">
                              {p.disabled ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">Inactive</span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">Active</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openCloneForm(p)} className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Clone Variant"><Copy size={13} /></button>
                                <button onClick={() => openEditForm(p)} className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit"><Edit2 size={13} /></button>
                                <button onClick={() => setDeleteConfirm(p.code)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete"><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!loading && products.length === 0 && (
                          <tr><td colSpan={5} className="px-5 py-8 text-center text-zinc-400">No matching instruments found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  <div className="px-5 py-3 border-t border-zinc-200 bg-zinc-50/50 flex items-center justify-between text-xs text-zinc-500">
                    <span>Showing page {page} of {totalPages || 1}</span>
                    <div className="flex gap-1">
                      <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-zinc-200 bg-white hover:bg-zinc-50 rounded disabled:opacity-50">Prev</button>
                      <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-zinc-200 bg-white hover:bg-zinc-50 rounded disabled:opacity-50">Next</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Import' && (
              <div className="bg-white rounded-xl border border-zinc-200 p-8 shadow-xs max-w-2xl">
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-zinc-900">Batch Import Catalog</h3>
                  <p className="text-xs text-zinc-500 mt-1">Upload a CSV or JSON file to batch import surgical instruments. The AI indexes will automatically update upon success.</p>
                </div>
                <label className="block cursor-pointer">
                  <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-xl p-12 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors group">
                    <input type="file" accept=".csv,.json" className="hidden" onChange={handleImport} disabled={importing} />
                    <div className="w-12 h-12 rounded-full bg-white border border-zinc-200 flex items-center justify-center mx-auto mb-3 shadow-xs group-hover:scale-105 transition-transform">
                      <Upload size={20} className="text-zinc-400 group-hover:text-indigo-500" />
                    </div>
                    <p className="text-sm font-bold text-zinc-700 group-hover:text-indigo-600">
                      {importing ? 'Processing Import...' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-1">CSV or JSON (max 50MB)</p>
                  </div>
                </label>
                {importResult && (
                  <div className={cn("mt-6 p-4 rounded-lg border text-xs", importResult.errors?.length ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800")}>
                    <p className="font-bold mb-2">Import Complete</p>
                    <div className="flex gap-4 font-mono mb-2">
                      <span>Created: {importResult.created}</span>
                      <span>Updated: {importResult.updated}</span>
                      <span>Skipped: {importResult.skipped}</span>
                    </div>
                    {importResult.errors?.length > 0 && (
                      <ul className="list-disc pl-4 space-y-1 text-red-700 max-h-32 overflow-y-auto mt-2 opacity-90">
                        {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Mappings' && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Total Identifications', value: mappingStats.identifications },
                    { label: 'Saved Mappings', value: mappingStats.mappings },
                    { label: 'Confirmed by Admin', value: mappingStats.explicit_confirmations }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
                      <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{stat.label}</p>
                      <p className="text-2xl font-black text-zinc-900 mt-1">{stat.value}</p>
                    </div>
                  ))}
                </div>
                
                <div className="bg-white border border-zinc-200 rounded-xl shadow-xs p-6">
                  <h3 className="text-sm font-bold text-zinc-900 mb-4">Add Manual Mapping</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <input type="text" placeholder="Competitor Code (e.g. BD012R)" value={mappingForm.competitor_code} onChange={e => setMappingForm(p => ({...p, competitor_code: e.target.value}))} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
                    <input type="text" placeholder="IMPL Code (e.g. 11-299-14-07)" value={mappingForm.impl_code} onChange={e => setMappingForm(p => ({...p, impl_code: e.target.value}))} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
                  </div>
                  <button onClick={handleConfirmMapping} disabled={mappingSaving} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-950 text-white text-xs font-bold rounded shadow-xs transition-colors">Save Mapping</button>
                  {mappingError && <p className="text-red-500 text-xs mt-2">{mappingError}</p>}
                </div>

                <div className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-zinc-200">
                    <div className="relative max-w-sm">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input type="text" placeholder="Search mappings..." value={mappingSearch} onChange={e => setMappingSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 text-[11px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-200">
                        <th className="px-5 py-3">Competitor Info</th>
                        <th className="px-5 py-3">Mapped To (IMPL)</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-sm">
                      {mappingLoading ? (
                         <tr><td colSpan={4} className="px-5 py-8 text-center text-zinc-400">Loading...</td></tr>
                      ) : mappings.map(m => (
                        <tr key={m.competitor_code}>
                          <td className="px-5 py-3">
                            <p className="font-bold text-zinc-900 font-mono text-xs">{m.competitor_code}</p>
                            {(m.competitor_name || m.competitor_manufacturer) && (
                              <p className="text-[11px] text-zinc-500 mt-0.5">{m.competitor_manufacturer} {m.competitor_name}</p>
                            )}
                          </td>
                          <td className="px-5 py-3 font-mono text-xs font-bold text-indigo-600">{m.impl_code}</td>
                          <td className="px-5 py-3 text-[11px] font-bold">
                            {m.confirmed === 2 ? <span className="text-emerald-600">Manual</span> : <span className="text-blue-600">Auto</span>}
                          </td>
                          <td className="px-5 py-3 text-right">
                             <button onClick={() => handleDeleteMapping(m.competitor_code)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {showPanel && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-950/20 backdrop-blur-sm" onClick={() => setShowPanel(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-xl bg-white h-full shadow-2xl border-l border-zinc-200 flex flex-col">
              <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
                <h3 className="text-sm font-bold text-zinc-900">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                <button onClick={() => setShowPanel(false)} className="p-2 hover:bg-zinc-200 rounded-full text-zinc-500"><X size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Basic Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Article Code *</label>
                      <input type="text" value={formData.code} onChange={e => setFormData(p => ({...p, code: e.target.value}))} disabled={!!editingProduct} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-zinc-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Family ID</label>
                      <input type="text" value={formData.family_id} onChange={e => setFormData(p => ({...p, family_id: e.target.value}))} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Product Name *</label>
                    <input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Description / Article Text</label>
                    <textarea rows={3} value={formData.article_text} onChange={e => setFormData(p => ({...p, article_text: e.target.value}))} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Specialty</label>
                      <select value={formData.specialty} onChange={e => setFormData(p => ({...p, specialty: e.target.value}))} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                        {SPECIALTIES.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.disabled} onChange={e => setFormData(p => ({...p, disabled: e.target.checked}))} className="w-4 h-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500" />
                        <span className="text-sm font-medium text-zinc-700">Disable Product</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Specs */}
                <div className="space-y-3 pt-4 border-t border-zinc-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Specifications</h4>
                    <button onClick={addSpec} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 uppercase">Add Row</button>
                  </div>
                  {specs.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" placeholder="Key (e.g. Length)" value={s.key} onChange={e => updateSpec(i, 'key', e.target.value)} className="w-1/3 px-3 py-1.5 border border-zinc-200 rounded-lg text-xs outline-none focus:border-indigo-500" />
                      <input type="text" placeholder="Value (e.g. 15cm)" value={s.value} onChange={e => updateSpec(i, 'value', e.target.value)} className="flex-1 px-3 py-1.5 border border-zinc-200 rounded-lg text-xs outline-none focus:border-indigo-500" />
                      <button onClick={() => removeSpec(i)} className="p-1.5 text-zinc-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  {specs.length === 0 && <p className="text-xs text-zinc-400 italic">No specifications defined.</p>}
                </div>

                {/* Image */}
                <div className="space-y-3 pt-4 border-t border-zinc-100">
                  <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Product Image</h4>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center overflow-hidden shrink-0">
                      {imagePreview ? (
                         <img src={imagePreview} alt="Preview" className="w-full h-full object-contain p-1" />
                      ) : (editingProduct && editingProduct.has_image) ? (
                         <img src={getProductImage(editingProduct.code)} alt="Current" className="w-full h-full object-contain p-1" />
                      ) : (
                         <Image size={24} className="text-zinc-300" />
                      )}
                    </div>
                    <label className="cursor-pointer px-4 py-2 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors">
                      Choose Image
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    </label>
                  </div>
                </div>

                {saveError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle size={14} /> {saveError}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-end gap-3">
                <button onClick={() => setShowPanel(false)} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-700">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors">{saving ? 'Saving...' : 'Save Product'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xl max-w-sm w-full space-y-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-2">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h4 className="text-sm font-bold text-zinc-900">Delete Product</h4>
              <p className="text-xs text-zinc-500">Are you sure you want to permanently delete instrument <strong className="text-zinc-900">{deleteConfirm}</strong>? This cannot be undone.</p>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 text-xs font-bold border border-zinc-200 rounded-lg hover:bg-zinc-50">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xs">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
