# KELOMPOK 6 LAB — Live Shopping & Flash Sale Produk Kosmetik

Repositori ini berisi implementasi *microservices* untuk sistem **Live Shopping & Flash Sale Produk Kosmetik & Kecantikan** pada mata kuliah Praktikum Scalable Systems.

## Anggota Kelompok & Peran

| Nama | Peran | Tanggung Jawab |
| :--- | :--- | :--- |
| **MUH. EKA ANDRI SETIAWAN** | Arsitek Sistem | Merancang arsitektur, diagram, ADR, dan menjaga konsistensi desain |
| **RISKI NOPIANTI** | Backend/API Engineer | Mengimplementasikan endpoint/service inti dan logika bisnis |
| **Wafiq Azizah** | Data & Persistence Engineer | Skema data, cache/Redis, konsistensi stok, dan migrasi |
| **ANDI NAILAH MASHFUFAH SULFA** | QA, Load-Test & Dokumentasi | Pengujian, load test, AI-LOG, README, dan laporan akhir |

## Deskripsi Sistem

Sistem ini dirancang untuk menangani lonjakan trafik (*high concurrency*) saat sesi *live streaming* penjualan produk kosmetik serta ajang promo *flash sale* untuk produk kecantikan pilihan (seperti lipstick, skincare, cushion, dll.).

## Struktur Repositori & Progress Sesi 01

* `services/catalog/` — Layanan katalog produk kosmetik berbasis Express.js (Port `3005`).
* `docs/ARSITEKTUR.md` — Pemodelan *Bounded Context* & *Context Map* (Domain-Driven Design).
* `openapi.yaml` — Spesifikasi kontrak API OpenAPI 3.0.3.
* `AI-LOG.md` — Rekam jejak prompt, penolakan, dan validasi AI.

## Cara Menjalankan Service

**1. Menjalankan Catalog Service**
```bash
cd services/catalog
npm install
node index.js
