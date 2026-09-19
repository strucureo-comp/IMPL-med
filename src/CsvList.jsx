import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, Check, CheckCheck, FileSpreadsheet, LoaderCircle, Pause, Play, RotateCcw, Scissors, Search, Upload, X } from 'lucide-react';
import { imageUrl, safeUrl } from './api';
import { csvFields, exampleCsv, fieldLabels, makeQuery, mapCsvRows, parseCsv, rowError, suggestMapping } from './csvImport';
import useBatchSearch, { errorText } from './useBatchSearch';

const statuses = { queued: 'Queued', searching: 'Searching', ready: 'Ready', review: 'Needs review', no_match: 'No match', error: 'Error', added: 'Added' };
const filters = [['all', 'All'], ['ready', 'Ready'], ['review', 'Needs review'], ['no_match', 'No match'], ['error', 'Errors'], ['added', 'Added']];
function Photo({ product, variant }) {
  const [failed, setFailed] = useState(false);
  const category = variant?.category_slug?.[0] || product.categories?.[0];
  const filename = variant?.image_file || product.image_file;
  const available = variant ? variant.has_image : product.has_image;
  useEffect(() => setFailed(false), [category, filename]);
  return <div className="batch-photo">{available && category && filename && !failed ? <img src={imageUrl(category, filename)} alt={product.base_name} onError={() => setFailed(true)} /> : <Scissors size={25} />}</div>;
}
function ArticleChoice({ product, row, batch, onChosen }) {
  const [family, setFamily] = useState(null);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setFamily(null); setError('');
    batch.fetchFamily(product.family_key).then(data => {
      if (!alive) return;
      setFamily(data);
      setCode(data.variants?.find(variant => variant.code === row.selected?.variant.code)?.code || data.variants?.find(variant => variant.code === product.best_match_code)?.code || data.variants?.[0]?.code || '');
    }).catch(value => { if (alive) setError(errorText(value)); });
    return () => { alive = false; };
  }, [product.family_key, row.id, retry]);
  const variant = family?.variants?.find(value => value.code === code);
  const chosen = row.selected?.variant.code === code;
  return <section className="batch-article-choice" aria-label="Choose matching article"><button className="text-button" onClick={onChosen}><ArrowLeft size={14} /> All candidates</button><Photo product={product} variant={variant} /><h4>{family?.base_name || product.base_name}</h4>
    {error ? <div className="notice error" role="alert"><p>{error}</p><button className="text-button" onClick={() => setRetry(value => value + 1)}>Retry details</button></div> : !family ? <p className="loading-inline" role="status"><LoaderCircle size={17} className="spin" /> Loading article specifications…</p> : <><label className="batch-label">Article / size<select aria-label="Choose article / size" value={code} onChange={event => setCode(event.target.value)} disabled={row.status === 'added'}>{family.variants?.map(value => <option key={value.code} value={value.code}>{value.code} · {value.specifications?.['Total length'] || value.variant_size || 'See specifications'}</option>)}</select></label>{variant && <><p>{variant.article_text}</p><dl className="batch-specs">{Object.entries(variant.specifications || {}).filter(([, value]) => value !== '' && value != null).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl>{safeUrl(variant.url) && <a className="text-button" href={safeUrl(variant.url)} target="_blank" rel="noopener noreferrer">View catalog reference <ArrowRight size={14} /></a>}<button className="primary-button full" disabled={row.status === 'added' || chosen} onClick={() => { batch.choose(row.id, { ...product, base_name: family.base_name || product.base_name }, variant); }}>{chosen ? <Check size={17} /> : <CheckCheck size={17} />}{row.status === 'added' ? 'Already added to tray' : chosen ? 'Selected for this row' : 'Use this article'}</button></>}{!family.variants?.length && <p>No articles are available in this family. Choose another candidate.</p>}</>}
  </section>;
}
function ReviewPanel({ row, batch, onClose, opener }) {
  const [query, setQuery] = useState(row.query);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(row.data);
  const [product, setProduct] = useState(row.selected?.product || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const heading = useRef(null);
  const panel = useRef(null);
  const [overlay, setOverlay] = useState(() => window.matchMedia('(max-width:1050px)').matches);
  const requestId = useRef(0);
  useEffect(() => {
    const media = window.matchMedia('(max-width:1050px)');
    const resize = () => setOverlay(media.matches);
    media.addEventListener('change', resize); return () => media.removeEventListener('change', resize);
  }, []);
  useEffect(() => {
    requestId.current++;
    setQuery(row.query); setPage(1); setData(row.data); setProduct(row.selected?.product || null); setBusy(false); setError('');
  }, [row.id, row.attempt, row.data]);
  useEffect(() => {
    heading.current?.focus();
    if (!window.matchMedia('(max-width:1050px)').matches) panel.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    const previous = opener;
    const onKey = event => { if (event.key === 'Escape') { event.preventDefault(); onClose(); } };
    document.addEventListener('keydown', onKey);
    return () => { requestId.current++; document.removeEventListener('keydown', onKey); queueMicrotask(() => { if (previous?.isConnected && previous.getClientRects().length) previous.focus(); }); };
  }, []);
  useEffect(() => {
    if (!overlay) return;
    const saved = [];
    let element = panel.current;
    while (element && element !== document.body) {
      for (const sibling of element.parentElement?.children || []) {
        if (sibling !== element && sibling instanceof HTMLElement) { saved.push([sibling, sibling.inert]); sibling.inert = true; }
      }
      element = element.parentElement;
    }
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const trap = event => {
      if (event.key !== 'Tab') return;
      const elements = [...panel.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]')].filter(value => value.getClientRects().length);
      const first = elements[0]; const last = elements.at(-1);
      if (!first) { event.preventDefault(); heading.current.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => { saved.forEach(([element, inert]) => { element.inert = inert; }); document.body.style.overflow = overflow; document.removeEventListener('keydown', trap); };
  }, [overlay]);
  const changePage = async next => {
    const id = ++requestId.current;
    setBusy(true); setError('');
    try { const result = await batch.fetchSearch(row.query, next); if (id === requestId.current) { setData(result); setPage(next); } }
    catch (value) { if (id === requestId.current) setError(errorText(value)); }
    finally { if (id === requestId.current) setBusy(false); }
  };
  const canSearch = !['added', 'queued', 'searching'].includes(row.status);
  const pages = Math.max(1, Math.ceil((data?.pagination?.total ?? data?.total ?? 0) / (data?.pagination?.per_page || 20)));
  return <aside ref={panel} className="batch-review" role={overlay ? 'dialog' : undefined} aria-modal={overlay ? true : undefined} aria-label={`Review CSV row ${row.id}`}><div className="batch-review-heading"><div><span className="eyebrow">REQUESTED ITEM · ROW {row.id}</span><h3 ref={heading} tabIndex={-1}>{row.description || row.code}</h3></div><button className="icon-button" onClick={onClose} aria-label="Close row review"><X size={20} /></button></div><div className="batch-original"><span>{[row.brand, row.code, row.size].filter(Boolean).join(' · ') || 'Description search'}</span><strong>Quantity: {row.quantity}</strong><span className={`batch-status ${row.status}`}>{statuses[row.status]}</span></div>
    <div className="batch-review-body"><form className="batch-query" onSubmit={event => { event.preventDefault(); if (query.trim() && canSearch) batch.retry(row.id, query.trim()); }}><label className="batch-label">Search text<input aria-label="Row search text" value={query} onChange={event => setQuery(event.target.value)} disabled={!canSearch} /></label><button className="secondary-button" disabled={!canSearch || !query.trim()}><RotateCcw size={15} /> Search again</button></form>
      {row.status === 'added' && <div className="inline-success"><CheckCheck size={17} /> Added to your tray. Edit its quantity in the surgery tray.</div>}
      {['queued', 'searching'].includes(row.status) && <p className="batch-empty" role="status"><LoaderCircle className="spin" size={22} />{row.status === 'queued' ? 'Waiting to search this item.' : 'Searching this item…'}</p>}
      {row.error && <div className="notice error" role="alert"><p>{row.error}</p><button className="text-button" onClick={() => batch.retry(row.id)}>Retry this row</button></div>}
      {data?.message && <div className="notice"><p>{data.message}</p></div>}{data?.suggestion && <div className="notice suggestion"><p>{data.suggestion}</p></div>}
      {data?.competitor_context?.source_urls?.some(safeUrl) && <div className="source-links">{data.competitor_context.source_urls.filter(safeUrl).map((url, index) => <a key={url} href={safeUrl(url)} target="_blank" rel="noopener noreferrer">Reference {index + 1}</a>)}</div>}
      {product ? <ArticleChoice key={`${row.id}-${product.family_key}`} product={product} row={row} batch={batch} onChosen={() => setProduct(null)} /> : data && <><div className="batch-candidate-title"><h4>{data.results?.length ? 'Choose a matching instrument' : 'No matching instruments'}</h4><p>{data.results?.length ? 'Select an article and size.' : 'Edit the search text to try again.'}</p></div>{data.results?.map(value => <button key={value.family_key} className={`batch-candidate ${value.match_degraded ? 'degraded' : ''}`} onClick={() => setProduct(value)}><Photo product={value} /><span><small>{value.family_key}{value.match_type === 'competitor_resolved' ? ' · Competitor equivalent' : ''}</small><strong>{value.base_name}</strong><span>{value.variant_count || value.variants?.length || 0} articles · View sizes</span>{value.match_reason && <em>{value.match_reason}</em>}{value.match_degraded && <em>Low-confidence match · Check specifications</em>}</span><ArrowRight size={16} /></button>)}</>}
      {error && <div className="notice error" role="alert"><p>{error}</p><button className="text-button" onClick={() => changePage(page)}>Retry candidates</button></div>}{!product && pages > 1 && <div className="batch-pagination"><button className="secondary-button" disabled={busy || page <= 1} onClick={() => changePage(page - 1)}>Previous</button><span>{busy ? 'Loading…' : `${page} / ${pages}`}</span><button className="secondary-button" disabled={busy || page >= pages} onClick={() => changePage(page + 1)}>Next</button></div>}
    </div>
  </aside>;
}

export default function CsvList({ file, active, onPick, onOrdinarySearch, onAdd, onViewTray }) {
  const batch = useBatchSearch(active);
  const [matrix, setMatrix] = useState([]);
  const [filename, setFilename] = useState('');
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState(Object.fromEntries(csvFields.map(field => [field, -1])));
  const [draft, setDraft] = useState([]);
  const [started, setStarted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [filter, setFilter] = useState('all');
  const [reviewId, setReviewId] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [addError, setAddError] = useState('');
  const opener = useRef(null);
  useEffect(() => {
    if (!file) return;
    let alive = true;
    batch.pause(); setUploading(true); setUploadError('');
    parseCsv(file).then(values => {
      if (!alive) return;
      const guessed = suggestMapping(values[0]);
      const header = Object.values(guessed).some(index => index >= 0);
      if (values.length > 101) throw new Error('This CSV contains more than 100 items. Split it into lists of up to 100; no rows have been imported.');
      setMatrix(values); setFilename(file.name); setHasHeader(header);
      setMapping(header ? guessed : Object.fromEntries(csvFields.map((field, index) => [field, index < values[0].length ? index : -1])));
      setStarted(false); setReviewId(null); setFeedback(''); setAddError(''); setFilter('all');
    }).catch(error => { if (alive) setUploadError(error.message); }).finally(() => { if (alive) setUploading(false); });
    return () => { alive = false; };
  }, [file]);
  useEffect(() => { setDraft(mapCsvRows(matrix, hasHeader, mapping)); }, [matrix, hasHeader, mapping]);
  useEffect(() => {
    const onUnload = event => { if (matrix.length && (!started || batch.rows.some(row => row.status !== 'added'))) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', onUnload); return () => window.removeEventListener('beforeunload', onUnload);
  }, [matrix.length, started, batch.rows]);
  useEffect(() => { if (!active) setReviewId(null); }, [active]);
  const edit = (id, field, value) => setDraft(rows => rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  const included = draft.filter(row => !row.excluded);
  const invalid = included.filter(row => rowError(row));
  const tooMany = draft.length > 100;
  const ready = batch.rows.filter(row => row.status === 'ready');
  const pending = batch.rows.filter(row => ['queued', 'searching'].includes(row.status));
  const searched = batch.rows.length - pending.length;
  const displayed = batch.rows.filter(row => filter === 'all' || row.status === filter);
  const review = batch.rows.find(row => row.id === reviewId);
  const openRow = (row, event) => { opener.current = event.currentTarget; setReviewId(row.id); };
  const add = () => {
    try {
      const count = batch.addReady(onAdd);
      if (count) { setFeedback(`${count} requested ${count === 1 ? 'item' : 'items'} added to your surgery tray.`); setAddError(''); }
    } catch (error) { setAddError(error.message); }
  };
  return <section className="csv-workspace" hidden={!active} aria-label="CSV list search"><div className="csv-heading"><div><h2>{started ? 'Review matches' : 'Import CSV'}</h2>{filename && <p>{filename}</p>}</div><div className="csv-heading-actions"><button className="text-button" onClick={onOrdinarySearch}><Search size={16} /> Single search</button><button className="secondary-button" onClick={onPick} disabled={uploading}><Upload size={16} /> {matrix.length ? 'Replace CSV' : 'Choose CSV'}</button></div></div>
    <div className="csv-steps"><span className={!started ? 'current' : 'complete'}><span>{started ? <Check size={13} /> : '1'}</span> Check columns</span><ArrowRight size={15} /><span className={started ? 'current' : ''}><span>2</span> Review matches</span></div>
    {uploading && <p className="loading-inline" role="status"><LoaderCircle className="spin" size={18} /> Reading your CSV…</p>}{uploadError && <div className="notice error" role="alert">{uploadError}</div>}
    {!matrix.length && !uploading && <div className="csv-dropzone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); onPick(event.dataTransfer.files[0]); }}><span className="csv-file-icon"><FileSpreadsheet size={32} /></span><h3>Upload CSV</h3><p>Drop a CSV here or choose a file.</p><button className="primary-button" onClick={onPick}><Upload size={16} /> Choose CSV file</button><span>Up to 100 items · CSV up to 2 MB</span><button className="text-button" onClick={exampleCsv}><ArrowDownToLine size={15} /> Download example CSV</button></div>}
    {matrix.length > 0 && !started && <><div className="csv-mapping"><div className="csv-mapping-heading"><div><h3>Check your columns</h3><p>Unmapped fields are ignored.</p></div><label className="csv-header-toggle"><input type="checkbox" checked={hasHeader} onChange={event => { const checked = event.target.checked; setHasHeader(checked); if (checked) setMapping(suggestMapping(matrix[0])); }} /> First row contains headers</label></div><div className="csv-mapping-fields">{csvFields.map(field => <label className="batch-label" key={field}>{fieldLabels[field]}<select aria-label={`Map ${fieldLabels[field]} column`} value={mapping[field]} onChange={event => setMapping(value => ({ ...value, [field]: Number(event.target.value) }))}><option value={-1}>{field === 'quantity' ? 'Not mapped · Default 1' : 'Not mapped'}</option>{Array.from({ length: Math.max(...matrix.map(row => row.length)) }, (_, index) => <option value={index} key={index}>{hasHeader ? matrix[0][index] || `Column ${index + 1}` : `Column ${index + 1}`}</option>)}</select></label>)}</div></div>
      <div className="csv-preview-heading"><div><h3>Preview your searches</h3><p>Edit or exclude rows before searching.</p></div><button className="text-button" onClick={exampleCsv}><ArrowDownToLine size={15} /> Example CSV</button></div>{tooMany && <div className="notice error" role="alert">This list exceeds 100 items. Split the file before searching.</div>}{invalid.length > 0 && <div className="notice suggestion" role="status">{invalid.length} {invalid.length === 1 ? 'row needs' : 'rows need'} correction or exclusion before searching.</div>}
      <div className="csv-preview-list">{draft.map(row => <div className={`csv-preview-row ${row.excluded ? 'excluded' : ''}`} key={row.id}><label className="csv-include"><input type="checkbox" checked={!row.excluded} aria-label={`Include CSV row ${row.id}`} onChange={event => edit(row.id, 'excluded', !event.target.checked)} /><span>Row {row.id}</span></label><div className="csv-edit-fields">{csvFields.map(field => <label className="batch-label" key={field}>{fieldLabels[field]}<input aria-label={`Row ${row.id} ${fieldLabels[field]}`} value={row[field]} disabled={row.excluded} onChange={event => edit(row.id, field, event.target.value)} inputMode={field === 'quantity' ? 'numeric' : undefined} /></label>)}</div><div className="csv-generated-query"><span>Search text</span><strong>{makeQuery(row) || 'Add a code or description'}</strong>{!row.excluded && rowError(row) && <p role="alert">{rowError(row)}</p>}</div></div>)}</div>
      <div className="csv-preview-footer"><p>{included.length} included · {draft.length - included.length} excluded</p><button className="primary-button" disabled={uploading || tooMany || !included.length || invalid.length > 0} onClick={() => { batch.start(included.map(row => ({ ...row, code: row.code.trim(), description: row.description.trim(), query: makeQuery(row) }))); setStarted(true); }}><Search size={17} /> Search {included.length} {included.length === 1 ? 'item' : 'items'}</button></div>
    </>}
    {started && <><div className="batch-progress"><div><div className="batch-progress-copy"><strong>{searched} of {batch.rows.length} searched</strong><span>{pending.length ? batch.paused ? pending.some(row => row.status === 'searching') ? 'Pausing after current item' : 'Paused' : 'Searching your list' : 'Search complete'}</span></div><progress max={batch.rows.length} value={searched} aria-label="List search progress" /></div><div className="batch-progress-actions">{pending.length > 0 && <button className="secondary-button" onClick={batch.paused ? batch.resume : batch.pause}>{batch.paused ? <Play size={15} /> : <Pause size={15} />}{batch.paused ? 'Resume' : 'Pause'}</button>}{batch.rows.some(row => row.status === 'error') && <button className="text-button" onClick={batch.retryErrors}><RotateCcw size={15} /> Retry errors</button>}</div></div>
      {feedback && <div className="inline-success batch-feedback" role="status"><CheckCheck size={19} /><span>{feedback}</span><button className="text-button" onClick={onViewTray}>View tray <ArrowRight size={14} /></button></div>}{addError && <div className="notice error" role="alert">{addError}</div>}
      <div className="batch-filters" aria-label="Filter list results">{filters.map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span>{value === 'all' ? batch.rows.length : batch.rows.filter(row => row.status === value).length}</span></button>)}</div>
      <div className={`batch-results-layout ${review ? 'review-open' : ''}`}><div className="batch-table-wrap"><table className="batch-table"><thead><tr><th>Requested item</th><th>Qty</th><th>Selected article</th><th>Status</th></tr></thead><tbody>{displayed.map(row => <tr key={row.id} className={reviewId === row.id ? 'selected-row' : ''}><td><button className="batch-row-open" onClick={event => openRow(row, event)} aria-label={`Review row ${row.id}: ${row.description || row.code}`}><span className="batch-row-number">{String(row.id).padStart(2, '0')}</span><span><strong>{row.description || row.code}</strong><small>{[row.code, row.brand, row.size].filter(Boolean).join(' · ') || row.query}</small></span></button></td><td data-label="Quantity">{row.quantity}</td><td data-label="Article">{row.selected ? <button className="batch-selected-article" onClick={event => openRow(row, event)}><strong>{row.selected.variant.code}</strong><small className="batch-selected-name" title={row.selected.product.base_name}>{row.selected.product.base_name}</small><small>{row.selected.variant.specifications?.['Total length'] || row.selected.variant.variant_size}{row.exact ? ' · Exact code' : ''}</small></button> : <button className="text-button" onClick={event => openRow(row, event)}>{row.status === 'review' ? 'Choose article' : row.status === 'error' ? 'Retry / edit' : row.status === 'no_match' ? 'Edit search' : 'View progress'} <ArrowRight size={13} /></button>}</td><td data-label="Status"><span className={`batch-status ${row.status}`}>{row.status === 'searching' && <LoaderCircle className="spin" size={12} />}{['ready', 'added'].includes(row.status) && <Check size={12} />}{statuses[row.status]}</span></td></tr>)}</tbody></table>{!displayed.length && <div className="batch-empty">No items in this view. Choose another filter.</div>}</div>{review && <ReviewPanel key={review.id} row={review} batch={batch} opener={opener.current} onClose={() => setReviewId(null)} />}</div>
      <div className="batch-add-footer"><div><p>Quantities for repeated articles are combined.</p></div><button className="primary-button" onClick={add} disabled={!ready.length}><CheckCheck size={17} /> Add {ready.length} ready {ready.length === 1 ? 'item' : 'items'} to tray</button></div><p className="batch-session-note">Reloading clears this review; added tray items stay saved.</p><span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{searched} of {batch.rows.length} items searched. {ready.length} ready.</span>
    </>}
  </section>;
}
