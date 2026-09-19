const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status}). Please try again.`);
  if (!data) throw new Error('The search service returned an unreadable response. Please try again.');
  return data;
}

export function search(query, filters, page, signal) {
  const params = new URLSearchParams({ q: query.trim(), page: String(page), per_page: '20' });
  Object.entries(filters).forEach(([key, value]) => { if (value !== '') params.set(key, value); });
  return request(`/api/search?${params}`, { signal });
}

export function searchImage(file, signal) {
  const body = new FormData();
  body.append('image', file);
  body.append('top_k', '30');
  return request('/api/search-by-image', { method: 'POST', body, signal });
}

export const getFamily = (key, signal) => request(`/api/family/${encodeURIComponent(key)}`, { signal });
// The Pi may return a stored path (cardio/images/...) instead of a bare filename.
export const imageUrl = (category, filename) => `${base}/api/image/${encodeURIComponent(category)}/${encodeURIComponent(String(filename).split(/[\\/]/).pop())}`;
export const safeUrl = (url) => { try { const parsed = new URL(url); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null; } catch { return null; } };
