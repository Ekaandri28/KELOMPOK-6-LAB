# Laporan Proyek Terpadu — Kelompok 6 · Tema: Live Shopping & Flash Sale Kosmetik

## 1. Ringkasan Produk

Sistem **Live Shopping & Flash Sale Produk Kosmetik** dirancang untuk menangani lonjakan trafik tinggi (*high concurrency*) saat sesi siaran langsung penjualan produk kosmetik dan ajang flash sale. Sumber daya rebutan intinya adalah **stok produk**: ribuan pembeli bisa menekan tombol beli bersamaan, sehingga sistem harus menjamin stok tidak terjual melebihi jumlah yang tersedia (*no oversell*) — bahkan di bawah beban ratusan permintaan serentak.

---

## 2. Lapisan 1 — Microservices

### Layanan & Tanggung Jawab

| Service | Port | Tanggung Jawab | Database |
|---|---|---|---|
| **catalog-service** | 3005 | Kelola produk, harga normal, harga kilat (flash price) | SQLite (`catalog.db`) |
| **stock-service** | 3006 | Kurangi & pulihkan stok secara atomic (transaksi SQL) | SQLite (`stock.db`) |
| **order-service** | 3007 | Buat pesanan, hitung total, lacak status, rollback stok | SQLite (`order.db`) |
| **live-service** | 3008 | Kelola sesi siaran, produk diangkat, countdown promo | SQLite (`live.db`) |

### Endpoint Kritis

| Endpoint | Method | Fungsi | Kode Normal |
|---|---|---|---|
| `POST /orders` | order-service | Buat pesanan — kurangi stok secara atomic | 201 |
| `PUT /stock/:id/reduce` | stock-service | Kurangi stok (ATOMIC, BEGIN IMMEDIATE) | 200 |
| `GET /sessions/:id/countdown` | live-service | Hitung mundur promo flash sale | 200 |
| `PATCH /products/:id/flash-price` | catalog-service | Set harga kilat | 200 |

### Hasil Uji Asap (Smoke Test)

```
node --test tests/smoke.test.js
```

| Layanan | Tests | Pass | Fail |
|---|---|---|---|
| catalog-service | 5 | 5 | 0 |
| stock-service | 4 | 4 | 0 |
| order-service | 5 | 5 | 0 |
| live-service | 4 | 4 | 0 |
| **Total** | **19** | **19** | **0** |

Semua layanan menjawab dengan kode HTTP yang benar:
- `200` untuk GET yang valid
- `201` untuk POST yang berhasil
- `400` untuk request tanpa field wajib
- `404` untuk resource yang tidak ada
- `409` untuk stok tidak mencukupi *(perilaku benar, bukan error)*

### Referensi

- Kontrak API: [`openapi.yaml`](./openapi.yaml)
- Konfigurasi layanan: [`docker-compose.yml`](./docker-compose.yml)
- Test asap: [`tests/smoke.test.js`](./tests/smoke.test.js)

---

## 3. Lapisan 2 — Scalable

### Titik Macet yang Ditemukan (Baseline)

Dari hasil load test baseline (`-c 200 -a 3000 POST /orders`):

- **Throughput rendah**: hanya **82 req/s** untuk POST /orders dengan 200 koneksi bersamaan
- **Latency ekor tinggi**: p99 mencapai **9.314 ms** — 1 dari 100 permintaan menunggu hampir 10 detik
- **Error rate tinggi**: **2.673 dari 3.000** permintaan non-2xx (stok habis + timeout)
- **Penyebab utama**: SQLite dengan `BEGIN IMMEDIATE` menyebabkan lock contention saat 200 koneksi berebut tulis bersamaan; permintaan yang kalah antre lama atau timeout

### Tabel Hasil Load Test (Sebelum → Sesudah)

Perintah identik digunakan di semua baris:
```
node tests/loadtest.js
# setara: autocannon -c200 -a3000 -mPOST -H content-type:application/json -b '{...}' http://localhost:3007/orders
```

| Perubahan | p50 | p95 | p99 | Throughput | Non-2xx | Errors |
|---|---|---|---|---|---|---|
| **Baseline** (SQLite atomic) | 259 ms | ~8.285 ms | 9.314 ms | 82 req/s | 2.673 | 281 timeout |
| *+ indeks / optimasi* | *(belum diukur)* | — | — | — | — | — |
| *+ replica / cache* | *(belum diukur)* | — | — | — | — | — |

> **Catatan**: Kolom "sesudah" akan diisi setelah peran Data & Backend menerapkan optimasi (indeks, connection pool, atau migrasi ke database yang mendukung concurrent write lebih baik). Perintah load test **harus identik** agar angka bisa dibandingkan.

**Mengapa p95 lebih jujur dari rata-rata:**
Rata-rata latency baseline = 773 ms — terdengar lumayan. Namun p95 = ~8.285 ms — artinya 1 dari 20 pengguna menunggu >8 detik. Rata-rata menyembunyikan ekor lambat; p95/p99 menolak menyembunyikannya.

### Bukti Sumber Daya Rebutan Tidak Jebol (Uji Oversell)

```
node --test tests/rebutan.test.js
```

**Kondisi uji:**
- Stok awal: **0 pcs** (telah habis dari load test sebelumnya)
- Penyerbu: **300 permintaan bersamaan** (`Promise.all`)

**Hasil:**
```
sukses (201)               = 0
ditolak stok habis (409)   = 300  ← perilaku BENAR
error server (5xx)         = 0
Sisa stok setelah serangan = 0    ← tidak minus
```

**Kesimpulan**: Uji **LULUS** ✓
- Sisa stok tidak minus → tidak terjadi oversell
- Tidak ada error 5xx → sistem stabil di bawah beban
- 409 adalah respons yang benar, bukan kegagalan

Implementasi `BEGIN IMMEDIATE` di stock-service (`services/stock/index.js:76`) berhasil menjaga atomicity operasi pengurangan stok.

---

## 4. Lapisan 3 — Mobile

> *Bagian ini akan diisi oleh anggota kelompok yang mengerjakan lapisan Mobile.*

- Layar utama & kemampuan offline: *(belum tersedia)*
- Tautan APK: *(belum tersedia)*
- Rekaman demo ujung-ke-ujung: *(belum tersedia)*

---

## 5. Pelajaran & Pembagian Peran

### Apa yang Berubah dari Rencana

| Aspek | Rencana Awal | Kenyataan |
|---|---|---|
| Database | Redis untuk stok | SQLite dengan `BEGIN IMMEDIATE` — lebih sederhana, cukup untuk skala lab |
| Load test | Via CLI autocannon | Via script Node programatik — karena PowerShell memiliki masalah escaping argumen JSON |
| Stok seed | Seragam 100/produk | Divariasikan (47, 12, 83, 5, ...) agar lebih realistis |

### Kontribusi Tiap Peran

| Peran | Nama | Kontribusi |
|---|---|---|
| Arsitek Sistem | MUH. EKA ANDRI SETIAWAN | Rancang arsitektur, diagram alur, ADR, openapi.yaml |
| Backend/API Engineer | RISKI NOPIANTI | Implementasi 4 microservice + endpoint kritis |
| Data & Persistence | Wafiq Azizah | Skema SQLite, operasi atomic `BEGIN IMMEDIATE`, seed data |
| QA, Load-Test & Dok. | ANDI NAILAH MASHFUFAH SULFA | Smoke test, uji rebutan, load test baseline, laporan ini |

---

## 6. Lampiran

### Perintah Uji (Reproducible)

```bash
# 1. Jalankan semua service
docker compose down -v && docker compose up --build -d

# 2. Tunggu semua healthy
docker compose ps

# 3. Smoke test (Lapisan 1)
node --test tests/smoke.test.js

# 4. Load test baseline (Lapisan 2)
node tests/loadtest.js

# 5. Uji rebutan / oversell (Lapisan 2)
node --test tests/rebutan.test.js
```

### Spesifikasi Mesin Uji

| Spesifikasi | Nilai |
|---|---|
| OS | Windows 11 (via Docker Desktop) |
| Node.js | v20.14.0 |
| Docker | v29.0.1 |
| autocannon | v8.0.0 |
| Mode deployment | Docker container lokal (localhost) |

> Angka load test diukur di mesin lokal — bukan Codespaces. Hasil di Codespaces kampus mungkin berbeda tergantung spesifikasi runner. Gunakan perintah identik di lingkungan yang sama untuk perbandingan yang valid.
