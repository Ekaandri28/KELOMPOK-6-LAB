// ============================================================
// API SERVICE LAYER — Kelompok 6 Live Shopping Kosmetik
// Menghubungkan frontend ke 4 microservice
// ============================================================

const API = {
  CATALOG: 'http://localhost:3005',
  STOCK:   'http://localhost:3006',
  ORDER:   'http://localhost:3007',
  LIVE:    'http://localhost:3008',
};

async function request(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
  } catch (err) {
    throw err;
  }
}

// ── CATALOG SERVICE ──────────────────────────────────────────
const CatalogAPI = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`${API.CATALOG}/products${q ? '?' + q : ''}`);
  },
  getOne: (id) => request(`${API.CATALOG}/products/${id}`),
  create: (body) => request(`${API.CATALOG}/products`, { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`${API.CATALOG}/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => request(`${API.CATALOG}/products/${id}`, { method: 'DELETE' }),
  setFlashPrice: (id, flash_price) =>
    request(`${API.CATALOG}/products/${id}/flash-price`, { method: 'PATCH', body: JSON.stringify({ flash_price }) }),
};

// ── STOCK SERVICE ─────────────────────────────────────────────
const StockAPI = {
  getAll: () => request(`${API.STOCK}/stock`),
  getOne: (productId) => request(`${API.STOCK}/stock/${productId}`),
  init: (product_id, quantity) =>
    request(`${API.STOCK}/stock`, { method: 'POST', body: JSON.stringify({ product_id, quantity }) }),
  reduce: (productId, amount) =>
    request(`${API.STOCK}/stock/${productId}/reduce`, { method: 'PUT', body: JSON.stringify({ amount }) }),
  restore: (productId, amount) =>
    request(`${API.STOCK}/stock/${productId}/restore`, { method: 'PUT', body: JSON.stringify({ amount }) }),
};

// ── ORDER SERVICE ─────────────────────────────────────────────
const OrderAPI = {
  getAll: (status) => {
    const q = status ? `?status=${status}` : '';
    return request(`${API.ORDER}/orders${q}`);
  },
  getOne: (id) => request(`${API.ORDER}/orders/${id}`),
  create: (body) => request(`${API.ORDER}/orders`, { method: 'POST', body: JSON.stringify(body) }),
  updateStatus: (id, status) =>
    request(`${API.ORDER}/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

// ── LIVE SERVICE ──────────────────────────────────────────────
const LiveAPI = {
  getSessions: (status) => {
    const q = status ? `?status=${status}` : '';
    return request(`${API.LIVE}/sessions${q}`);
  },
  getSession: (id) => request(`${API.LIVE}/sessions/${id}`),
  createSession: (body) => request(`${API.LIVE}/sessions`, { method: 'POST', body: JSON.stringify(body) }),
  updateStatus: (id, status) =>
    request(`${API.LIVE}/sessions/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  featureProduct: (id, body) =>
    request(`${API.LIVE}/sessions/${id}/feature`, { method: 'PATCH', body: JSON.stringify(body) }),
  getCountdown: (id) => request(`${API.LIVE}/sessions/${id}/countdown`),
};
