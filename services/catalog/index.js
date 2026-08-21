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
    image_url   TEXT,
    created_at  TEXT    DEFAULT (datetime('now'))
  );
`);

// Migrasi: tambah kolom image_url jika belum ada (untuk DB yang sudah terbuat)
try {
  db.exec(`ALTER TABLE products ADD COLUMN image_url TEXT`);
  console.log('[catalog] Kolom image_url berhasil ditambahkan');
} catch (e) {
  // Kolom sudah ada, abaikan error
}

// Seed data produk kosmetik jika tabel kosong
const count = db.prepare('SELECT COUNT(*) as c FROM products').get();
if (count.c === 0) {
  const insert = db.prepare(`
    INSERT INTO products (name, category, normal_price, flash_price, description, image_url)
    VALUES (@name, @category, @normal_price, @flash_price, @description, @image_url)
  `);
  // Data dari DATA MICROSERVICES.xlsx — produk lip kosmetik lokal
  const seedData = [
    { name: 'OMG oh my Glam Mattelast Lip Cream',                    category: 'Lip Cream',  normal_price: 79000,  flash_price: 28000,  description: 'Merek: OMG — Lip Cream matte tahan lama',              image_url: null },
    { name: 'G2G BRIGHTENING LIP SERUM',                             category: 'Lip Serum',  normal_price: 159000, flash_price: 32900,  description: 'Merek: Glad 2 Glow — Lip serum pencerah bibir',        image_url: null },
    { name: 'WARDAH Everyday Fruity Sheer Lip Balm & Moisture',      category: 'Lip Balm',   normal_price: 50000,  flash_price: 10200,  description: 'Merek: WARDAH — Lip balm buah melembabkan bibir',      image_url: null },
    { name: 'HANASUI Next Level Butter Balm',                        category: 'Lip Balm',   normal_price: 53000,  flash_price: 10997,  description: 'Merek: HANASUI — Butter balm untuk bibir lembut',      image_url: null },
    { name: 'Dazzle-Me Ink-Vinyl Lip Lacquer Lip Cream Lipstick Glossy', category: 'Lip Cream', normal_price: 21235, flash_price: 15178, description: 'Merek: Dazzle Me — Lip cream glossy vinyl finish',    image_url: null },
    { name: 'The Originote Hyaluberry Lip Serum',                    category: 'Lip Serum',  normal_price: 31500,  flash_price: 12000,  description: 'Merek: The Originote — Lip serum hyaluronic + berry',  image_url: null },
    { name: 'Raecca Glow Up Tint',                                   category: 'Lip Tint',   normal_price: 83000,  flash_price: 51000,  description: 'Merek: Raecca — Lip tint glow natural',                 image_url: null },
    { name: 'You Cloud Paint Matte Lasting',                         category: 'Lip Cream',  normal_price: 145000, flash_price: 44700,  description: 'Merek: YOU — Lip cream matte cloud finish',             image_url: null },
    { name: 'Xi Xiu DIVINE Lipteen Stain',                           category: 'Lip Tint',   normal_price: 36000,  flash_price: 27000,  description: 'Merek: Xi Xiu — Lip tint stain tahan lama',            image_url: null },
    { name: 'Magefy Lip Gloss',                                      category: 'Lip Gloss',  normal_price: 90000,  flash_price: 13900,  description: 'Merek: Magefy — Lip gloss berkilau',                   image_url: null },
    { name: 'JIERA Lip Peptint with 2 in 1',                         category: 'Lip Tint',   normal_price: 68000,  flash_price: 27900,  description: 'Merek: JIERA — Lip tint + peptida 2 in 1',             image_url: null },
    { name: 'OMG OH MY GLAM Gloss Up Tinted Lip Balm',               category: 'Lip Balm',   normal_price: 98000,  flash_price: 14500,  description: 'Merek: OMG — Tinted lip balm glossy',                  image_url: null },
    { name: 'Facetology Glassy Spill The Tint',                      category: 'Lip Tint',   normal_price: 88000,  flash_price: 19900,  description: 'Merek: Facetology — Lip tint glassy spill effect',     image_url: null },
    { name: 'Glowsophy Color Crush Juicy Tinted Lip Balm',           category: 'Lip Balm',   normal_price: 119000, flash_price: 29900,  description: 'Merek: Glowsophy — Tinted lip balm juicy color',       image_url: null },
    { name: 'Ebelin - Bloop Pop Gloss Balm',                         category: 'Lip Balm',   normal_price: 75000,  flash_price: 23856,  description: 'Merek: Ebelin — Gloss balm pop warna ceria',           image_url: null },
    { name: 'CINDYNAL Matte Lipstick Capsule',                       category: 'Lip Gloss',  normal_price: 20900,  flash_price: 12365,  description: 'Merek: CINDYNAL — Lipstick kapsul matte',              image_url: null },
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
  const { name, category, normal_price, flash_price, description, image_url } = req.body;
  if (!name || !category || !normal_price) {
    return res.status(400).json({ error: 'Field name, category, normal_price wajib diisi' });
  }
  const result = db.prepare(`
    INSERT INTO products (name, category, normal_price, flash_price, description, image_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, category, normal_price, flash_price ?? null, description ?? null, image_url ?? null);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ data: product });
});

// PUT /products/:id  – update produk
app.put('/products/:id', (req, res) => {
  const { name, category, normal_price, flash_price, description, image_url } = req.body;
  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Produk tidak ditemukan' });

  db.prepare(`
    UPDATE products
    SET name=?, category=?, normal_price=?, flash_price=?, description=?, image_url=?
    WHERE id=?
  `).run(name, category, normal_price, flash_price ?? null, description ?? null, image_url ?? null, req.params.id);

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
