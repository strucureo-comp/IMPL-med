const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: {},
    ...options,
  };
  if (config.body && !(config.body instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(config.body);
  }
  const res = await fetch(url, config);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res;
}

async function requestJson(path, options = {}) {
  const res = await request(path, options);
  return res.json();
}

export function getHealth() {
  return requestJson('/health');
}

export function searchProducts({ query, page = 1, specialty, family_id, show_disabled = false }) {
  const body = { query, page, show_disabled };
  if (specialty) body.specialty = specialty;
  if (family_id) body.family_id = family_id;
  return requestJson('/search', {
    method: 'POST',
    body,
  });
}

export async function searchImage(file, top_k = 20) {
  const form = new FormData();
  form.append('file', file);
  const res = await request(`/search/image?top_k=${top_k}`, { method: 'POST', body: form });
  return res.json();
}

export function getProduct(code) {
  return requestJson(`/products/${encodeURIComponent(code)}`);
}

export function getProductImage(code) {
  return `${API_BASE}/products/${encodeURIComponent(code)}/image`;
}

export function getChatImage(filename) {
  return `${API_BASE}/chat/images/${encodeURIComponent(filename)}`;
}

export function getFamilies(specialty) {
  const params = specialty ? `?specialty=${encodeURIComponent(specialty)}` : '';
  return requestJson(`/families${params}`);
}

export function getCart(sessionId) {
  return requestJson(`/cart/${encodeURIComponent(sessionId)}`);
}

export function addToCart(sessionId, productCode, quantity = 1, options = {}) {
  const body = { session_id: sessionId, product_code: productCode, quantity };
  if (options.competitor_code != null) body.competitor_code = options.competitor_code;
  if (options.competitor_name != null) body.competitor_name = options.competitor_name;
  if (options.competitor_manufacturer != null) body.competitor_manufacturer = options.competitor_manufacturer;
  if (options.match_percent != null) body.match_percent = options.match_percent;
  return requestJson('/cart/add', {
    method: 'POST',
    body,
  });
}

export function updateCartItem(sessionId, itemId, quantity) {
  return requestJson('/cart/update', {
    method: 'PUT',
    body: { session_id: sessionId, item_id: itemId, quantity },
  });
}

export function removeFromCart(sessionId, itemId) {
  return requestJson(`/cart/${encodeURIComponent(sessionId)}/remove/${itemId}`, {
    method: 'DELETE',
  });
}

export function clearCart(sessionId) {
  return requestJson(`/cart/${encodeURIComponent(sessionId)}/clear`, {
    method: 'DELETE',
  });
}

export async function checkoutCart(payload) {
  const res = await request('/cart/checkout', {
    method: 'POST',
    body: payload,
  });
  return res.blob();
}

export function matchRequirementStream(requirement, onEvent) {
  const controller = new AbortController();

  fetch(`${API_BASE}/match/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requirement }),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      onEvent({ type: 'error', data: err.detail || 'Match stream request failed' });
      return;
    }
    consumeSSE(res, onEvent);
  }).catch((err) => {
    if (err.name !== 'AbortError') {
      onEvent({ type: 'error', data: err.message });
    }
  });

  return () => controller.abort();
}

export function matchImageStream(file, onEvent) {
  const controller = new AbortController();

  const form = new FormData();
  form.append('file', file);

  fetch(`${API_BASE}/match/stream/image`, {
    method: 'POST',
    body: form,
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      onEvent({ type: 'error', data: err.detail || 'Image match stream request failed' });
      return;
    }
    consumeSSE(res, onEvent);
  }).catch((err) => {
    if (err.name !== 'AbortError') {
      onEvent({ type: 'error', data: err.message });
    }
  });

  return () => controller.abort();
}

async function consumeSSE(res, onEvent) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      
      if (chunk.trim()) {
        const lines = chunk.split('\n');
        let eventType = 'message';
        let eventData = '';
        
        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            eventData += line.slice(5).trim();
          }
        }
        
        if (eventData) {
          try {
            const parsed = JSON.parse(eventData);
            // If the backend sends an event type, pass it through; otherwise if the JSON has a 'type', use that
            onEvent(eventType !== 'message' ? { type: eventType, ...parsed } : parsed);
          } catch (e) {
            console.error('SSE parse error:', e, chunk);
          }
        }
      }
      boundary = buffer.indexOf('\n\n');
    }
  }
}

export function getConversations() {
  return requestJson('/conversations');
}

export function createConversation(message) {
  return requestJson('/conversations', {
    method: 'POST',
    body: message ? { message } : {},
  });
}

export function deleteConversation(conversationId) {
  return requestJson(`/conversations/${conversationId}`, {
    method: 'DELETE',
  });
}

export function getConversationMessages(conversationId) {
  return requestJson(`/conversations/${conversationId}/messages`);
}

export function adminLogin(password) {
  return requestJson('/admin/login', {
    method: 'POST',
    body: { password },
  });
}

export function getAdminProducts(token, { page = 1, per_page = 20, search, specialty, family_id } = {}) {
  const params = new URLSearchParams({ page, per_page });
  if (search) params.set('search', search);
  if (specialty) params.set('specialty', specialty);
  if (family_id) params.set('family_id', family_id);
  return requestJson(`/admin/products?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getAdminProduct(token, code) {
  return requestJson(`/admin/products/${encodeURIComponent(code)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createAdminProduct(token, product) {
  return requestJson('/admin/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: product,
  });
}

export function updateAdminProduct(token, code, updates) {
  return requestJson(`/admin/products/${encodeURIComponent(code)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: updates,
  });
}

export async function deleteAdminProduct(token, code) {
  await request(`/admin/products/${encodeURIComponent(code)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function uploadAdminProductImage(token, code, file) {
  const form = new FormData();
  form.append('file', file);
  const res = await request(`/admin/products/${encodeURIComponent(code)}/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return res.json();
}

export async function adminImport(token, file) {
  const form = new FormData();
  form.append('file', file);
  const res = await request('/admin/import', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return res.json();
}

export function adminReindex(token) {
  return requestJson('/admin/reindex', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getSessionId() {
  let id = localStorage.getItem('kls_session_id');
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2);
    localStorage.setItem('kls_session_id', id);
  }
  return id;
}

export function listMappings(q = '', limit = 100) {
  const params = new URLSearchParams({ q: q || '', limit: String(limit) });
  return requestJson(`/mappings?${params}`);
}

export function confirmMapping(token, payload) {
  return requestJson('/mappings/confirm', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: payload,
  });
}

export async function deleteMapping(token, code) {
  await request(`/mappings/${encodeURIComponent(code)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getSearchHistory() {
  return requestJson('/search_history');
}

export function saveSearchHistoryEntry(entry) {
  return requestJson('/search_history', {
    method: 'POST',
    body: entry,
  });
}

export function clearSearchHistoryDB() {
  return requestJson('/search_history', {
    method: 'DELETE',
  });
}

export function getProductFamily(code) {
  return requestJson(`/products/${encodeURIComponent(code)}/family`);
}
