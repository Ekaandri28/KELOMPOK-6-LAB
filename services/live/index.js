const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3008;

app.use(cors());
app.use(express.json());

// ── Database setup ──────────────────────────────────────────────────────────
const db = new DatabaseSync(path.join(__dirname, 'live.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    title               TEXT    NOT NULL,
    status              TEXT    DEFAULT 'scheduled',  -- scheduled | live | ended
    featured_product_id INTEGER,
    flash_price         REAL,
    promo_duration_sec  INTEGER DEFAULT 300,          -- durasi promo dalam detik
    promo_start_time    TEXT,                         -- waktu promo mulai
    created_at          TEXT    DEFAULT (datetime('now')),
    updated_at          TEXT    DEFAULT (datetime('now'))
  );
`);

// ── Helper ──────────────────────────────────────────────────────────────────
function getCountdown(session) {
  if (!session.promo_start_time || session.status !== 'live') return null;
  // SQLite datetime('now') mengembalikan UTC – tambahkan ' UTC' agar JS parse dengan benar
  const start = new Date(session.promo_start_time + ' UTC').getTime();
  const end   = start + session.promo_duration_sec * 1000;
  const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000));
  return { remaining_seconds: remaining, ends_at: new Date(end).toISOString() };
}

// ── Routes ──────────────────────────────────────────────────────────────────

// GET /health
app.get('/health', (req, res) => {
  res.json({ service: 'live-service', status: 'ok', port: PORT });
});

// GET /sessions  – list semua sesi
app.get('/sessions', (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM sessions WHERE 1=1';
  const params = [];
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY created_at DESC';
  const sessions = db.prepare(query).all(...params);
  res.json({ data: sessions, total: sessions.length });
});

// GET /sessions/:id
app.get('/sessions/:id', (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan' });
  res.json({ data: session });
});

// POST /sessions  – buat sesi live baru
app.post('/sessions', (req, res) => {
  const { title, promo_duration_sec } = req.body;
  if (!title) return res.status(400).json({ error: 'Field title wajib diisi' });

  const result = db.prepare(`
    INSERT INTO sessions (title, promo_duration_sec)
    VALUES (?, ?)
  `).run(title, promo_duration_sec ?? 300);

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ data: session });
});

// PATCH /sessions/:id/status  – ubah status sesi (scheduled→live→ended)
app.patch('/sessions/:id/status', (req, res) => {
  const { status } = req.body;
  const validStatuses = ['scheduled', 'live', 'ended'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status harus salah satu dari: ${validStatuses.join(', ')}` });
  }

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan' });

  // Saat mulai live → catat waktu mulai promo
  const promo_start = status === 'live' ? new Date().toISOString() : session.promo_start_time;

  db.prepare(`
    UPDATE sessions
    SET status = ?, promo_start_time = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(status, promo_start, req.params.id);

  const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  res.json({ data: updated });
});

// PATCH /sessions/:id/feature  – angkat produk ke layar (set featured product + flash price)
app.patch('/sessions/:id/feature', (req, res) => {
  const { featured_product_id, flash_price, promo_duration_sec } = req.body;
  if (!featured_product_id) {
    return res.status(400).json({ error: 'Field featured_product_id wajib diisi' });
  }

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan' });

  db.prepare(`
    UPDATE sessions
    SET featured_product_id = ?,
        flash_price = ?,
        promo_duration_sec = ?,
        promo_start_time = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    featured_product_id,
    flash_price ?? null,
    promo_duration_sec ?? session.promo_duration_sec,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  res.json({ data: updated });
});

// GET /sessions/:id/countdown  – hitung mundur promo
app.get('/sessions/:id/countdown', (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan' });

  const countdown = getCountdown(session);
  if (!countdown) {
    return res.json({
      session_id: session.id,
      status: session.status,
      countdown: null,
      message: session.status === 'live' ? 'Tidak ada promo aktif' : 'Sesi belum dimulai atau sudah berakhir',
    });
  }
  res.json({
    session_id: session.id,
    featured_product_id: session.featured_product_id,
    flash_price: session.flash_price,
    countdown,
  });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[live-service] berjalan di port ${PORT}`);
});
