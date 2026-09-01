import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Download, Pencil, FileText, CheckCircle2, Hospital, Building, Calendar, Layers, ShieldCheck } from 'lucide-react';
import { cn } from './utils';
import { getProductImage, getSessionId, checkoutCart } from './api';

export default function CheckoutPreview({ items = [], onClose }) {
  const [editingField, setEditingField] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [form, setForm] = useState({
    hospital: 'St. Jude University Hospital',
    region: 'Cardiovascular Surgery Dept.',
    report_date: new Date().toISOString().split('T')[0],
    set_no: 'SET-CV-2026-08',
    name: 'Thoracic & Vascular Instrument Set',
    container: 'Sterile Container 1/1',
  });

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await checkoutCart({
        session_id: getSessionId(),
        hospital: form.hospital,
        region: form.region,
        report_date: form.report_date,
        set_no: form.set_no,
        quantity: totalQuantity,
        name: form.name,
        container: form.container,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `IMPL-${
        form.set_no !== '-' ? form.set_no.replace(/\s+/g, '-') : 'Report'
      }-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const EditableField = ({ field, label, value, className, align = 'left' }) => {
    return (
      <div className={cn('relative', className)}>
        <input
          type="text"
          value={value}
          placeholder={label}
          onChange={(e) => handleChange(field, e.target.value)}
          className={cn(
            'w-full bg-white border border-zinc-300 hover:border-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 text-xs outline-none font-semibold text-zinc-900 transition-colors',
            align === 'right' && 'text-right'
          )}
        />
        <Pencil
          size={10}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-xs"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex w-full max-w-5xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex-col md:flex-row"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-950 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* LEFT: PDF Sheet Preview (A4 aspect ratio) */}
        <div className="flex-1 overflow-y-auto bg-zinc-100 p-6 flex items-start justify-center">
          <div
            className="bg-white shadow-xl border border-zinc-300 w-full max-w-[480px] rounded-lg"
            style={{ aspectRatio: '210/297' }}
          >
            <div className="p-8 h-full flex flex-col font-sans text-zinc-900 text-xs">
              {/* Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-950 mb-4">
                <div>
                  <h3 className="text-sm font-black tracking-tight text-zinc-950">KLS MARTIN GROUP</h3>
                  <p className="text-[10px] text-zinc-500 font-medium">Surgical Instrument Set Report</p>
                </div>
                <span className="text-[9.5px] font-mono text-zinc-400 uppercase">DIN EN ISO 13485</span>
              </div>

              {/* Hospital / Region / Date */}
              <div className="space-y-1.5 mb-4 text-xs">
                <div className="flex items-baseline">
                  <span className="text-[11px] font-bold w-20 text-zinc-500">Hospital:</span>
                  <EditableField field="hospital" label="Hospital" value={form.hospital} className="flex-1" />
                </div>
                <div className="flex items-baseline">
                  <span className="text-[11px] font-bold w-20 text-zinc-500">Region:</span>
                  <EditableField field="region" label="Region" value={form.region} className="flex-1" />
                </div>
                <div className="flex items-baseline">
                  <span className="text-[11px] font-bold w-20 text-zinc-500">Date:</span>
                  <EditableField field="report_date" label="Date" value={form.report_date} className="flex-1" />
                </div>
              </div>

              {/* Set details banner */}
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs space-y-1 mb-4">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline">
                    <span className="font-bold mr-1 text-zinc-500">Set no.:</span>
                    <EditableField field="set_no" label="Set no." value={form.set_no} />
                  </div>
                  <div className="flex items-baseline font-mono">
                    <span className="font-bold mr-1 text-zinc-500">Total Qty:</span>
                    <span className="font-bold text-zinc-950">{totalQuantity}</span>
                  </div>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold mr-1 text-zinc-500">Name:</span>
                  <EditableField field="name" label="Name" value={form.name} className="flex-1" />
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold mr-1 text-zinc-500">Container:</span>
                  <EditableField field="container" label="Container" value={form.container} className="flex-1" />
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-zinc-950 text-zinc-600 font-bold">
                      <th className="text-left py-1.5 font-bold w-[24%]">Article No.</th>
                      <th className="text-left py-1.5 font-bold">Instrument Name</th>
                      <th className="text-right py-1.5 font-bold w-[12%]">Qty</th>
                      <th className="w-[18%]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {items.map((item, idx) => {
                      const p = item.product;
                      const productName = p?.name || item.product_code;
                      const hasImage = p?.has_image;
                      return (
                        <tr key={item.id || idx}>
                          <td className="py-2 font-mono text-zinc-600 align-top">{item.product_code}</td>
                          <td className="py-2 font-semibold text-zinc-950 align-top">{productName}</td>
                          <td className="py-2 font-mono text-right font-bold align-top">{item.quantity}</td>
                          <td className="py-2 text-right align-top">
                            {hasImage ? (
                              <img
                                src={getProductImage(item.product_code)}
                                alt={productName}
                                className="max-h-8 max-w-12 object-contain ml-auto"
                              />
                            ) : (
                              <span className="text-[9px] text-zinc-400 font-mono">No image</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Controls & Form */}
        <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-zinc-200 flex flex-col text-xs">
          <div className="p-5 border-b border-zinc-200">
            <h2 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
              <FileText size={15} className="text-zinc-950" />
              <span>Set Report Metadata</span>
            </h2>
            <p className="text-[11px] text-zinc-500 mt-1">
              Configure hospital details and surgery container specifications for the official PDF export.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
            <div>
              <label className="form-label">Hospital / Clinic</label>
              <input
                type="text"
                value={form.hospital}
                onChange={(e) => handleChange('hospital', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Department / Region</label>
              <input
                type="text"
                value={form.region}
                onChange={(e) => handleChange('region', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Set Designation</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="form-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="form-label">Set ID</label>
                <input
                  type="text"
                  value={form.set_no}
                  onChange={(e) => handleChange('set_no', e.target.value)}
                  className="form-input font-mono"
                />
              </div>
              <div>
                <label className="form-label">Container</label>
                <input
                  type="text"
                  value={form.container}
                  onChange={(e) => handleChange('container', e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-5 border-t border-zinc-200 space-y-2 bg-zinc-50">
            <button
              onClick={handleDownload}
              disabled={downloading || items.length === 0}
              className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-black text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Download size={14} />
              <span>{downloading ? 'Generating Official PDF...' : 'Download Official PDF Report'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 px-3 border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
