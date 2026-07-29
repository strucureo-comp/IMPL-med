const API_BASE = import.meta.env.VITE_API_BASE || '/api';

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
  return requestJson('/search', {
    method: 'POST',
    body: { query, page, specialty, family_id, show_disabled },
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

export function addToCart(sessionId, productCode, quantity = 1) {
  return requestJson('/cart/add', {
    method: 'POST',
    body: { session_id: sessionId, product_code: productCode, quantity },
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

export function streamChat(conversationId, message, onEvent) {
  const controller = new AbortController();

  fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversation_id: conversationId, message }),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      onEvent({ type: 'error', data: err.detail || 'Chat request failed' });
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

export function streamChatImage(conversationId, file, message, onEvent) {
  const controller = new AbortController();

  const form = new FormData();
  form.append('file', file);
  form.append('message', message || '');
  if (conversationId) form.append('conversation_id', conversationId);

  fetch(`${API_BASE}/chat/image`, {
    method: 'POST',
    body: form,
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      onEvent({ type: 'error', data: err.detail || 'Chat image request failed' });
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
    if (done) {
      if (buffer.trim()) {
        const remaining = buffer.split('\n');
        for (const line of remaining) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              onEvent(data);
            } catch {}
          }
        }
      }
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          onEvent(data);
        } catch {}
      }
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
  let id = sessionStorage.getItem('kls_session_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('kls_session_id', id);
  }
  return id;
}
