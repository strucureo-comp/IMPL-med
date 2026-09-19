import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, CheckCircle2, FileText, LoaderCircle } from 'lucide-react';
import { getFamily, imageUrl } from './api';

const localDate = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };

export default function TrayReport({ items, onBack, onDownloaded }) {
  const [form, setForm] = useState({ hospital: '', region: '', report_date: localDate(), set_no: '', name: 'Surgical instrument set', container: '' });
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reportItems, setReportItems] = useState(items);
  const enrichment = useRef(Promise.resolve(items));
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const families = new Map();
    enrichment.current = Promise.all(items.map(async item => {
      if (item.has_image !== undefined) return item;
      const key = item.family_key || item.code?.slice(0, 6);
      if (!key) return item;
      try {
        if (!families.has(key)) families.set(key, getFamily(key, controller.signal));
        const family = await families.get(key);
        const variant = family.variants?.find(value => value.code === item.code);
        return variant ? { ...item, has_image: variant.has_image, image_file: variant.image_file, image_category: variant.category_slug?.[0] || item.category } : item;
      } catch { return item; }
    }));
    enrichment.current.then(values => { clearTimeout(timeout); if (!controller.signal.aborted) setReportItems(values); });
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [items]);
  const update = (key, value) => { setForm(previous => ({ ...previous, [key]: value })); setMessage(''); };
  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  const download = async () => {
    setDownloading(true); setError(''); setMessage('');
    try {
      const { downloadTrayPdf } = await import('./trayPdf');
      await downloadTrayPdf(await enrichment.current, form);
      setMessage('Your PDF report has been downloaded.');
      onDownloaded();
    } catch (e) { setError(e.message || 'Could not create the report. Please try again.'); }
    finally { setDownloading(false); }
  };
  return <div className="report-layout">
    <section className="report-preview" aria-label="PDF report preview"><div className="report-sheet"><div className="report-sheet-header"><strong>IMPL</strong><span>INSTRUMENT INTELLIGENCE</span></div><span className="report-document-label">SURGICAL INSTRUMENT SET REPORT</span><h3>{form.name || 'Surgery tray'}</h3><dl className="report-metadata"><div><dt>Hospital / clinic</dt><dd>{form.hospital || 'Not specified'}</dd></div><div><dt>Department / region</dt><dd>{form.region || 'Not specified'}</dd></div><div><dt>Set ID</dt><dd>{form.set_no || 'Not specified'}</dd></div><div><dt>Container</dt><dd>{form.container || 'Not specified'}</dd></div><div><dt>Report date</dt><dd>{form.report_date || localDate()}</dd></div><div><dt>Tray quantity</dt><dd>{total} instruments · {items.length} {items.length === 1 ? 'article' : 'articles'}</dd></div></dl><div className="report-table-scroll"><table><thead><tr><th>Article code</th><th>Instrument</th><th>Qty</th><th>Image</th></tr></thead><tbody>{reportItems.map(item => <tr key={item.code}><td>{item.code}</td><td>{item.name}<small>{item.size}</small></td><td>{item.quantity}</td><td>{item.has_image && item.image_file ? <img src={imageUrl(item.image_category || item.category, item.image_file)} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} /> : '—'}</td></tr>)}</tbody></table></div><p className="report-sheet-note">Catalog source: KLS Martin. Verify article specifications before use.</p></div></section>
    <section className="report-controls" aria-label="Report details"><div className="report-controls-heading"><FileText size={20} /><div><h3>Report details</h3></div></div><div className="report-fields">{[['hospital', 'Hospital / clinic', 'Hospital or clinic name'], ['region', 'Department / region', 'e.g. Cardiovascular surgery'], ['name', 'Set name', 'Instrument set name'], ['set_no', 'Set ID', 'Your set reference'], ['container', 'Container', 'Container name or reference']].map(([key, label, placeholder]) => <label key={key} htmlFor={`report-${key}`}>{label}<input id={`report-${key}`} value={form[key]} placeholder={placeholder} maxLength={180} onChange={e => update(key, e.target.value)} /></label>)}<label htmlFor="report-date">Report date<input id="report-date" type="date" value={form.report_date} onChange={e => update('report_date', e.target.value)} required /></label></div>
      <div className="report-actions">{message && <div className="inline-success" role="status"><CheckCircle2 size={18} /><span>{message}</span></div>}{error && <div className="notice error" role="alert">{error}</div>}<button className="primary-button full" onClick={download} disabled={downloading || !items.length || !form.report_date}>{downloading ? <LoaderCircle className="spin" size={17} /> : <ArrowDownToLine size={17} />}{downloading ? 'Creating your PDF…' : 'Download PDF report'}</button><button className="text-button" onClick={onBack} disabled={downloading}><ArrowLeft size={15} /> Back to surgery tray</button></div>
    </section>
  </div>;
}
