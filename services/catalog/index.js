const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

// ── Database setup ──────────────────────────────────────────────────────────
const db = new DatabaseSync(path.join(__dirname, 'catalog.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    category    TEXT    NOT NULL,
    normal_price REAL   NOT NULL,
    flash_price  REAL,
    description TEXT,
    created_at  TEXT    DEFAULT (datetime('now'))
  );
`);

// Seed data produk kosmetik jika tabel kosong
const count = db.prepare('SELECT COUNT(*) as c FROM products').get();
if (count.c === 0) {
  const insert = db.prepare(`
    INSERT INTO products (name, category, normal_price, flash_price, description)
    VALUES (@name, @category, @normal_price, @flash_price, @description)
  `);
  const seedData = [
    { name: 'Lipstik Matte Rouge',      category: 'Lipstik',    normal_price: 85000,  flash_price: 45000,  description: 'Lipstik matte tahan lama, 12 pilihan warna' },
    { name: 'BB Cream SPF 50',           category: 'Foundation', normal_price: 120000, flash_price: 75000,  description: 'BB cream ringan dengan perlindungan UV' },
    { name: 'Cushion Foundation Glow',   category: 'Foundation', normal_price: 199000, flash_price: 99000,  description: 'Cushion foundation untuk tampilan glowing' },
    { name: 'Serum Vitamin C Brightening',category:'Skincare',   normal_price: 250000, flash_price: 150000, description: 'Serum pencerah wajah dengan Vitamin C 20%' },
    { name: 'Moisturizer Gel Aloe',      category: 'Skincare',   normal_price: 89000,  flash_price: 55000,  description: 'Pelembab gel ringan berbasis lidah buaya' },
    { name: 'Eyeshadow Palette 12 Warna',category: 'Mata',       normal_price: 175000, flash_price: 89000,  description: 'Palet eyeshadow 12 warna pigmented' },
    { name: 'Blush On Peach Flush',      category: 'Pipi',       normal_price: 65000,  flash_price: 40000,  description: 'Blush on dengan warna peach natural' },
    { name: 'Setting Spray Long Last',   category: 'Setting',    normal_price: 75000,  flash_price: 45000,  description: 'Setting spray tahan makeup 24 jam' },
    { name: 'Primer Wajah Pore Blur',    category: 'Primer',     normal_price: 110000, flash_price: 70000,  description: 'Primer mengecilkan pori-pori tampak' },
    { name: 'Maskara Volume Max',        category: 'Mata',       normal_price: 95000,  flash_price: 55000,  description: 'Maskara volumizing anti-clump' },
  ];
  seedData.forEach(p => insert.run(p));
  console.log('[catalog] Seed data berhasil dimasukkan');
}

// ── Routes ──────────────────────────────────────────────────────────────────

// GET /health
app.get('/health', (req, res) => {
  res.json({ service: 'catalog-service', status: 'ok', port: PORT });
});

// GET /products  – bisa filter ?category=xxx atau ?flash_sale=true
app.get('/products', (req, res) => {
  const { category, flash_sale } = req.query;
  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (flash_sale === 'true') {
    query += ' AND flash_price IS NOT NULL';
  }
  query += ' ORDER BY id';

  const products = db.prepare(query).all(...params);
  res.json({ data: products, total: products.length });
});

// GET /products/:id
app.get('/products/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan' });
  res.json({ data: product });
});

// POST /products  – tambah produk baru
app.post('/products', (req, res) => {
  const { name, category, normal_price, flash_price, description } = req.body;
  if (!name || !category || !normal_price) {
    return res.status(400).json({ error: 'Field name, category, normal_price wajib diisi' });
  }
  const result = db.prepare(`
    INSERT INTO products (name, category, normal_price, flash_price, description)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, category, normal_price, flash_price ?? null, description ?? null);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ data: product });
});

// PUT /products/:id  – update produk
app.put('/products/:id', (req, res) => {
  const { name, category, normal_price, flash_price, description } = req.body;
  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Produk tidak ditemukan' });

  db.prepare(`
    UPDATE products
    SET name=?, category=?, normal_price=?, flash_price=?, description=?
    WHERE id=?
  `).run(name, category, normal_price, flash_price ?? null, description ?? null, req.params.id);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json({ data: product });
});

// PATCH /products/:id/flash-price  – set/hapus harga kilat
app.patch('/products/:id/flash-price', (req, res) => {
  const { flash_price } = req.body;
  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Produk tidak ditemukan' });

  db.prepare('UPDATE products SET flash_price = ? WHERE id = ?')
    .run(flash_price ?? null, req.params.id);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json({ data: product });
});

// DELETE /products/:id
app.delete('/products/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Produk tidak ditemukan' });
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ message: 'Produk berhasil dihapus' });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[catalog-service] berjalan di port ${PORT}`);
});
