import { useEffect, useRef, useState } from 'react';
import { getFamily, safeUrl, search } from './api';
import { isCatalogBrand } from './csvImport';

const normalizeCode = value => String(value || '').trim().replace(/[\u2010-\u2015]/g, '-').toUpperCase();
export const errorText = error => error.name === 'TimeoutError' ? 'This search timed out. Retry this row.' : error.message === 'Failed to fetch' ? 'Cannot reach the search service. Check the connection and retry.' : error.message || 'Search failed. Retry this row.';
export function trayArticle(product, variant, quantity) {
  return { code: variant.code, name: product.base_name, size: variant.specifications?.['Total length'] || variant.variant_size || '', category: variant.category_slug?.[0] || product.categories?.[0] || '', quantity, family_key: product.family_key, url: safeUrl(variant.url) || '', has_image: variant.has_image ?? product.has_image, image_file: variant.image_file || product.image_file, image_category: variant.category_slug?.[0] || product.categories?.[0] };
}

export default function useBatchSearch(active) {
  const [rows, setRows] = useState([]);
  const [paused, setPaused] = useState(true);
  const state = useRef({ rows: [], paused: true, generation: 0, pumping: null, controller: new AbortController(), tail: Promise.resolve(), searches: new Map(), families: new Map() });
  const patch = (id, changes) => {
    const current = state.current;
    current.rows = current.rows.map(row => row.id === id ? { ...row, ...changes } : row);
    setRows(current.rows);
  };
  const pause = () => { state.current.paused = true; setPaused(true); };
  const resume = () => { state.current.paused = false; setPaused(false); };
  useEffect(() => { if (!active) pause(); }, [active]);
  useEffect(() => () => { state.current.generation++; state.current.controller.abort(); }, []);
  // Search, automatic article enrichment, pagination, and review details share one lane.
  const schedule = task => {
    const current = state.current;
    const generation = current.generation;
    const signal = current.controller.signal;
    const job = current.tail.catch(() => {}).then(() => {
      if (signal.aborted || current.generation !== generation) throw new DOMException('Import changed', 'AbortError');
      return task(AbortSignal.any([signal, AbortSignal.timeout(60000)]));
    });
    current.tail = job;
    return job;
  };
  const cached = (cache, key, task) => {
    if (!cache.has(key)) {
      const promise = task().catch(error => { if (cache.get(key) === promise) cache.delete(key); throw error; });
      cache.set(key, promise);
    }
    return cache.get(key);
  };
  const rawSearch = (query, page, signal) => cached(state.current.searches, `${query.toLowerCase()}|${page}`, () => search(query, {}, page, signal));
  const rawFamily = (key, signal) => cached(state.current.families, key, () => getFamily(key, signal));
  const fetchSearch = (query, page = 1) => schedule(signal => rawSearch(query, page, signal));
  const fetchFamily = key => schedule(signal => rawFamily(key, signal));
  const start = input => {
    const current = state.current;
    current.controller.abort(); current.controller = new AbortController(); current.generation++;
    current.searches.clear(); current.families.clear();
    current.rows = input.map(row => ({ ...row, quantity: Number(row.quantity), status: 'queued', data: null, selected: null, exact: false, error: '', attempt: 0 }));
    setRows(current.rows); resume();
  };
  const pump = async () => {
    const current = state.current;
    const generation = current.generation;
    if (current.pumping === generation || current.paused || !active) return;
    current.pumping = generation;
    try {
      while (!current.paused && current.generation === generation) {
        const row = current.rows.find(value => value.status === 'queued');
        if (!row) break;
        patch(row.id, { status: 'searching', error: '' });
        try {
          const result = await schedule(async signal => {
            const data = await rawSearch(row.query, 1, signal);
            let selected = null;
            if (data.query_type === 'internal' && (!row.brand || isCatalogBrand(row.brand)) && normalizeCode(row.code).length > 6 && normalizeCode(row.query).split(/\s+/).includes(normalizeCode(row.code))) {
              const product = data.results?.find(value => value.variants?.some(variant => normalizeCode(variant.code) === normalizeCode(row.code)));
              if (product) {
                try {
                  const family = await rawFamily(product.family_key, signal);
                  const variant = family.variants?.find(value => normalizeCode(value.code) === normalizeCode(row.code));
                  if (variant) selected = { product: { ...product, base_name: family.base_name || product.base_name }, variant };
                } catch (error) {
                  if (signal.aborted) throw error;
                  return { data, selected: null, exact: false, status: 'review', error: 'This article was found, but its specifications could not be loaded. Open a candidate to retry its details.' };
                }
              }
            }
            return { data, selected, exact: Boolean(selected), status: selected ? 'ready' : data.results?.length ? 'review' : 'no_match' };
          });
          if (current.generation === generation) patch(row.id, result);
        } catch (error) {
          if (current.generation === generation) patch(row.id, { status: 'error', error: errorText(error) });
        }
      }
    } finally { if (current.pumping === generation) current.pumping = null; }
  };
  useEffect(() => { pump(); }, [rows, paused, active]);
  const retry = (id, query) => {
    const row = state.current.rows.find(value => value.id === id);
    if (!row || ['added', 'searching', 'queued'].includes(row.status)) return;
    state.current.searches.delete(`${(query ?? row.query).toLowerCase()}|1`);
    patch(id, { query: query ?? row.query, status: 'queued', data: null, selected: null, exact: false, error: '', attempt: row.attempt + 1 });
    resume();
  };
  const retryErrors = () => {
    state.current.rows.filter(row => row.status === 'error').forEach(row => retry(row.id));
  };
  const choose = (id, product, variant) => patch(id, { status: 'ready', selected: { product, variant }, exact: false });
  const addReady = onAdd => {
    const ready = state.current.rows.filter(row => row.status === 'ready');
    if (!ready.length) return 0;
    onAdd(ready.map(row => trayArticle(row.selected.product, row.selected.variant, row.quantity)));
    const ids = new Set(ready.map(row => row.id));
    state.current.rows = state.current.rows.map(row => ids.has(row.id) ? { ...row, status: 'added' } : row);
    setRows(state.current.rows);
    return ready.length;
  };
  return { rows, paused, start, pause, resume, retry, retryErrors, choose, addReady, fetchSearch, fetchFamily };
}
