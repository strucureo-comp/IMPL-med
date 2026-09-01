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
      await confirmMapping(payload);
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
      await deleteMapping(code);
      await loadMappings();
    } catch (err) {
      console.error('Delete mapping failed:', err);
    }
  };

