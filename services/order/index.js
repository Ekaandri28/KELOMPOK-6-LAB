const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3007;

// URL layanan lain (bisa di-override via environment variable untuk Docker)
const CATALOG_URL = process.env.CATALOG_URL || 'http://localhost:3005';
const STOCK_URL   = process.env.STOCK_URL   || 'http://localhost:3006';

app.use(cors());
app.use(express.json());

// ── Database setup ──────────────────────────────────────────────────────────
const db = new DatabaseSync(path.join(__dirname, 'order.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    items          TEXT    NOT NULL,     -- JSON: [{product_id, name, qty, unit_price}]
    total_price    REAL    NOT NULL,
    status         TEXT    DEFAULT 'pending',  -- pending | paid | cancelled
    customer_name  TEXT    NOT NULL,
    customer_email TEXT    NOT NULL,
    created_at     TEXT    DEFAULT (datetime('now')),
    updated_at     TEXT    DEFAULT (datetime('now'))
  );
`);

// ── Routes ──────────────────────────────────────────────────────────────────

// GET /health
app.get('/health', (req, res) => {
  res.json({ service: 'order-service', status: 'ok', port: PORT });
});

// GET /orders  – list semua pesanan
app.get('/orders', (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY created_at DESC';

  const orders = db.prepare(query).all(...params);
  const parsed = orders.map(o => ({ ...o, items: JSON.parse(o.items) }));
  res.json({ data: parsed, total: parsed.length });
});

// GET /orders/:id
app.get('/orders/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  res.json({ data: { ...order, items: JSON.parse(order.items) } });
});

// POST /orders  – buat pesanan baru
// Body: { customer_name, customer_email, items: [{product_id, qty}] }
app.post('/orders', async (req, res) => {
  const { customer_name, customer_email, items } = req.body;

  if (!customer_name || !customer_email || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Field customer_name, customer_email, dan items (array) wajib diisi' });
  }

  try {
    // 1. Ambil info produk dari catalog-service
    const enrichedItems = [];
    let total_price = 0;

    for (const item of items) {
      const { data: resp } = await axios.get(`${CATALOG_URL}/products/${item.product_id}`);
      const product = resp.data;
      // Gunakan flash_price jika ada, fallback ke normal_price
      const unit_price = product.flash_price ?? product.normal_price;
      enrichedItems.push({
        product_id: product.id,
        name: product.name,
        qty: item.qty,
        unit_price,
      });
      total_price += unit_price * item.qty;
    }

    // 2. Kurangi stok di stock-service (satu per satu)
    const reducedProducts = [];
    for (const item of enrichedItems) {
      try {
        await axios.put(`${STOCK_URL}/stock/${item.product_id}/reduce`, { amount: item.qty });
        reducedProducts.push(item.product_id);
      } catch (stockErr) {
        // Rollback stok yang sudah dikurangi
        for (const pid of reducedProducts) {
          const qty = enrichedItems.find(i => i.product_id === pid).qty;
          await axios.put(`${STOCK_URL}/stock/${pid}/restore`, { amount: qty }).catch(() => {});
        }
        const msg = stockErr.response?.data?.error || 'Stok tidak mencukupi';
        return res.status(409).json({ error: `Gagal kurangi stok produk ${item.product_id}: ${msg}` });
      }
    }

    // 3. Simpan pesanan
    const result = db.prepare(`
      INSERT INTO orders (items, total_price, customer_name, customer_email)
      VALUES (?, ?, ?, ?)
    `).run(JSON.stringify(enrichedItems), total_price, customer_name, customer_email);

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ data: { ...order, items: JSON.parse(order.items) } });

  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: 'Produk tidak ditemukan di catalog' });
    }
    console.error(err.message);
    res.status(500).json({ error: 'Gagal membuat pesanan: ' + err.message });
  }
});

// PATCH /orders/:id/status  – update status pesanan
app.patch('/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'paid', 'cancelled'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status harus salah satu dari: ${validStatuses.join(', ')}` });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });

  // Jika dibatalkan → kembalikan stok
  if (status === 'cancelled' && order.status !== 'cancelled') {
    const items = JSON.parse(order.items);
    for (const item of items) {
      await axios.put(`${STOCK_URL}/stock/${item.product_id}/restore`, { amount: item.qty }).catch(() => {});
    }
  }

  db.prepare(`
    UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?
  `).run(status, req.params.id);

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  res.json({ data: { ...updated, items: JSON.parse(updated.items) } });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[order-service] berjalan di port ${PORT}`);
  console.log(`  → CATALOG_URL : ${CATALOG_URL}`);
  console.log(`  → STOCK_URL   : ${STOCK_URL}`);
});
