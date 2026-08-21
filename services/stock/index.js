const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(express.json());

// ── Database setup ──────────────────────────────────────────────────────────
const db = new DatabaseSync(path.join(__dirname, 'stock.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS stock (
    product_id  INTEGER PRIMARY KEY,
    quantity    INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT    DEFAULT (datetime('now'))
  );
`);

// Seed stok awal untuk 10 produk (sesuai seed di catalog-service)
const count = db.prepare('SELECT COUNT(*) as c FROM stock').get();
if (count.c === 0) {
  const insert = db.prepare('INSERT INTO stock (product_id, quantity) VALUES (?, ?)');
  // Stok bervariasi agar lebih realistis
  const initialStocks = [47, 12, 83, 5, 120, 30, 68, 3, 95, 21];
  for (let i = 1; i <= 10; i++) {
    insert.run(i, initialStocks[i - 1]);
  }
  console.log('[stock] Seed stok awal berhasil');
}

// ── Routes ──────────────────────────────────────────────────────────────────

// GET /health
app.get('/health', (req, res) => {
  res.json({ service: 'stock-service', status: 'ok', port: PORT });
});

// GET /stock  – list semua stok
app.get('/stock', (req, res) => {
  const stocks = db.prepare('SELECT * FROM stock ORDER BY product_id').all();
  res.json({ data: stocks, total: stocks.length });
});

// GET /stock/:productId  – stok satu produk
app.get('/stock/:productId', (req, res) => {
  const stock = db.prepare('SELECT * FROM stock WHERE product_id = ?').get(req.params.productId);
  if (!stock) return res.status(404).json({ error: 'Stok produk tidak ditemukan' });
  res.json({ data: stock });
});

// POST /stock  – inisialisasi stok produk baru
app.post('/stock', (req, res) => {
  const { product_id, quantity } = req.body;
  if (!product_id || quantity === undefined) {
    return res.status(400).json({ error: 'Field product_id dan quantity wajib diisi' });
  }
  const existing = db.prepare('SELECT product_id FROM stock WHERE product_id = ?').get(product_id);
  if (existing) {
    return res.status(409).json({ error: 'Stok untuk produk ini sudah ada' });
  }
  db.prepare('INSERT INTO stock (product_id, quantity) VALUES (?, ?)').run(product_id, quantity);
  const stock = db.prepare('SELECT * FROM stock WHERE product_id = ?').get(product_id);
  res.status(201).json({ data: stock });
});

// PUT /stock/:productId/reduce  – kurangi stok (ATOMIC — UPDATE bersyarat, tanpa jendela race)
app.put('/stock/:productId/reduce', (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: { code: 'INPUT_TIDAK_VALID', message: 'amount harus bilangan bulat lebih dari 0' } });
  }

  // ✅ POLA BENAR: syarat (quantity >= amount) diperiksa di dalam WHERE saat UPDATE.
  // Tidak ada jendela antara baca dan tulis — database memutuskan atomik.
  // Berbeda dari pola SALAH (SELECT dulu → cek di JS → UPDATE terpisah) yang rentan race condition.
  const result = db.prepare(`
    UPDATE stock
    SET quantity = quantity - ?, updated_at = datetime('now')
    WHERE product_id = ? AND quantity >= ?
  `).run(amount, req.params.productId, amount);

  if (result.changes === 0) {
    // Tidak ada baris yang ter-update — cek apakah produk ada atau stok kurang
    const stock = db.prepare('SELECT * FROM stock WHERE product_id = ?').get(req.params.productId);
    if (!stock) {
      return res.status(404).json({ error: { code: 'STOK_TIDAK_ADA', message: 'Stok produk tidak ditemukan' } });
    }
    return res.status(409).json({ error: { code: 'STOK_HABIS', message: 'Stok tidak mencukupi' } });
  }

  const updated = db.prepare('SELECT * FROM stock WHERE product_id = ?').get(req.params.productId);
  res.json({ data: updated, message: `Stok berhasil dikurangi ${amount}` });
});

// PUT /stock/:productId/restore  – kembalikan stok (saat pesanan dibatalkan)
app.put('/stock/:productId/restore', (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Field amount harus lebih dari 0' });
  }

  const stock = db.prepare('SELECT * FROM stock WHERE product_id = ?').get(req.params.productId);
  if (!stock) return res.status(404).json({ error: 'Stok produk tidak ditemukan' });

  db.prepare(`
    UPDATE stock
    SET quantity = quantity + ?, updated_at = datetime('now')
    WHERE product_id = ?
  `).run(amount, req.params.productId);

  const updated = db.prepare('SELECT * FROM stock WHERE product_id = ?').get(req.params.productId);
  res.json({ data: updated, message: `Stok berhasil dikembalikan ${amount}` });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[stock-service] berjalan di port ${PORT}`);
});
