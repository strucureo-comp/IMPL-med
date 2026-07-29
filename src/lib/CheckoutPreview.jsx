import { useState } from 'react';
import { X, Download, Pencil } from 'lucide-react';
import { cn } from './utils';
import { getProductImage, getSessionId, checkoutCart } from './api';

export default function CheckoutPreview({ items = [], onClose }) {
  const [editingField, setEditingField] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [form, setForm] = useState({
    hospital: '',
    region: '',
    report_date: new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
    set_no: '-',
    name: 'Single instruments',
    container: '-',
  });

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
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
      a.download = `IMPL-${form.set_no !== '-' ? form.set_no.replace(/\s+/g, '-') : 'Report'}-${new Date().toISOString().slice(0, 10)}.pdf`;
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
    const isEditing = editingField === field;
    return (
      <div className={cn('group relative', className)}>
        {isEditing ? (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(field, e.target.value)}
            onBlur={() => setEditingField(null)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
            autoFocus
            className={cn(
              'w-full bg-white border border-blue-300 rounded px-1 py-0.5 text-[11px] leading-tight outline-none ring-2 ring-blue-100',
              align === 'right' && 'text-right'
            )}
          />
        ) : (
          <div
            onClick={() => setEditingField(field)}
            className={cn(
              'cursor-pointer rounded px-1 py-0.5 hover:bg-blue-50 hover:border hover:border-blue-200 transition-all min-h-[18px] flex items-center',
              align === 'right' && 'justify-end',
              !value && 'text-gray-300 italic'
            )}
          >
            <span className="text-[11px] leading-tight">{value || `+ ${label}`}</span>
            <Pencil size={8} className="ml-1 opacity-0 group-hover:opacity-100 text-blue-400 shrink-0 transition-opacity" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative z-10 flex w-full max-w-[1100px] max-h-[92vh] bg-white rounded-xl shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-1.5 rounded-lg bg-white/80 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
        >
          <X size={18} />
        </button>

        {/* LEFT: PDF Preview (A4 aspect ratio) */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-6 flex items-start justify-center">
          <div className="bg-white shadow-lg w-full max-w-[520px]" style={{ aspectRatio: '210/297' }}>
            <div className="p-8 h-full flex flex-col">
              {/* Thick top line */}
              <div className="h-[2px] bg-black w-full mb-5" />

              {/* Hospital / Region / Date */}
              <div className="flex justify-between mb-1">
                <div className="space-y-0.5">
                  <div className="flex items-baseline">
                    <span className="text-[11px] font-bold mr-1">Hospital:</span>
                    <EditableField field="hospital" label="Hospital" value={form.hospital} className="flex-1 max-w-[200px]" />
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-[11px] font-bold mr-1">Region:</span>
                    <EditableField field="region" label="Region" value={form.region} className="flex-1 max-w-[200px]" />
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-[11px] font-bold mr-1">Date:</span>
                    <EditableField field="report_date" label="Date" value={form.report_date} className="flex-1 max-w-[200px]" />
                  </div>
                </div>
              </div>

              <div className="h-3" />

              {/* Set no. / Quantity / Name / Container */}
              <div className="space-y-0.5">
                <div className="flex items-baseline">
                  <span className="text-[11px] font-bold mr-1">Set no.:</span>
                  <EditableField field="set_no" label="Set no." value={form.set_no} className="flex-1 max-w-[200px]" />
                  <div className="flex-1" />
                  <span className="text-[11px] font-bold mr-1">Quantity:</span>
                  <span className="text-[11px]">{totalQuantity}</span>
                </div>
                <div className="flex items-baseline">
                  <span className="text-[11px] font-bold mr-1">Name:</span>
                  <EditableField field="name" label="Name" value={form.name} className="flex-1 max-w-[300px]" />
                </div>
                <div className="flex items-baseline">
                  <span className="text-[11px] font-bold mr-1">Container:</span>
                  <EditableField field="container" label="Container" value={form.container} className="flex-1 max-w-[200px]" />
                </div>
              </div>

              <div className="h-3" />
              <div className="h-px bg-gray-400 w-full mb-2" />

              {/* Items table */}
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="text-left py-1.5 font-bold text-[10px] w-[22%]">Number</th>
                      <th className="text-left py-1.5 font-bold text-[10px]">Name</th>
                      <th className="text-left py-1.5 font-bold text-[10px] w-[14%]">Quantity<br />in set</th>
                      <th className="w-[18%]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const p = item.product;
                      const productName = p?.name || item.product_code;
                      const hasImage = p?.has_image;
                      return (
                        <tr key={item.id || idx} className="border-b border-gray-300">
                          <td className="py-2.5 text-[10px] align-top">{item.product_code}</td>
                          <td className="py-2.5 text-[10px] align-top">Art. No. {item.product_code}</td>
                          <td className="py-2.5 text-[10px] align-top">{item.quantity}</td>
                          <td className="py-2.5 align-top">
                            {hasImage ? (
                              <img
                                src={getProductImage(item.product_code)}
                                alt={productName}
                                className="max-h-[50px] max-w-[60px] object-contain"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-50 border border-gray-200 rounded flex items-center justify-center text-[8px] text-gray-300">
                                No img
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {items.length === 0 && (
                  <div className="py-8 text-center text-[10px] text-gray-300 italic">
                    No items in cart
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Controls */}
        <div className="w-[300px] bg-white border-l border-gray-200 flex flex-col">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">PDF Settings</h2>
            <p className="text-xs text-gray-400 mt-0.5">Click any field in the preview to edit</p>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Quick edit fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Hospital</label>
                <input
                  type="text"
                  value={form.hospital}
                  onChange={(e) => handleChange('hospital', e.target.value)}
                  placeholder="Hospital name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-all placeholder:text-gray-300"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Region</label>
                <input
                  type="text"
                  value={form.region}
                  onChange={(e) => handleChange('region', e.target.value)}
                  placeholder="Region"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-all placeholder:text-gray-300"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Date</label>
                <input
                  type="text"
                  value={form.report_date}
                  onChange={(e) => handleChange('report_date', e.target.value)}
                  placeholder="M/D/YYYY"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-all placeholder:text-gray-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Set no.</label>
                  <input
                    type="text"
                    value={form.set_no}
                    onChange={(e) => handleChange('set_no', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Quantity</label>
                  <div className="px-3 py-2 border border-gray-100 rounded-lg text-sm text-gray-500 bg-gray-50">
                    {totalQuantity}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Container</label>
                <input
                  type="text"
                  value={form.container}
                  onChange={(e) => handleChange('container', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-all"
                />
              </div>
            </div>

            {/* Items summary */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Items ({items.length})</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs text-gray-600">
                    <span className="truncate mr-2">{item.product?.name || item.product_code}</span>
                    <span className="text-gray-400 shrink-0">x{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-5 border-t border-gray-100 space-y-3">
            <button
              onClick={handleDownload}
              disabled={downloading || items.length === 0}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-all',
                items.length > 0 && !downloading
                  ? 'bg-[#c8102e] text-white hover:bg-[#b00d24] shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              <Download size={16} />
              {downloading ? 'Generating...' : 'Download PDF'}
            </button>
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
