# AI-LOG.md — Rekam Jejak Penggunaan GitHub Copilot
## Kelompok 6 — Live Shopping & Flash Sale Kosmetik
### Peran: QA, Load-Test & Dokumentasi (ANDI NAILAH MASHFUFAH SULFA)

---

### [QA] · Lapisan 1 · Entri 1
- **Konteks:** Membuat smoke test untuk memverifikasi semua endpoint kritis 4 microservice (catalog, stock, order, live).
- **Prompt:** *"Tulis uji node --test untuk 4 service: GET /health → 200, POST /orders sah → 201, POST /orders tanpa field wajib → 400, GET resource tidak ada → 404"*
- **Diterima:** Struktur dasar test dengan `assert.equal(res.status, ...)` dan penggunaan variabel `BASE_URL` per service — cocok karena setiap service punya port berbeda.
- **Ditolak:** Copilot menyarankan menggunakan `beforeEach` untuk reset data antar test. Ditolak karena `node --test` tidak memiliki lifecycle hooks seperti Jest; setiap test dibuat independen tanpa shared state.
- **Verifikasi:** `node --test tests/smoke.test.js` → hasil: pass 19, fail 0.

---

### [QA] · Lapisan 1 · Entri 2
- **Konteks:** Menulis assertion untuk status 409 (stok tidak cukup) pada stock-service.
- **Prompt:** *"Tambahkan test: PUT /stock/:id/reduce dengan amount sangat besar harus mengembalikan 409"*
- **Diterima:** Kode assertion `assert.equal(res.status, 409)` dengan komentar bahwa 409 adalah perilaku benar.
- **Ditolak:** Copilot awalnya menulis komentar `// ini error` di samping assertion 409. Ditolak dan dikoreksi — 409 bukan error, melainkan respons yang diharapkan saat stok habis. Komentar diganti menjadi `// 409 = stok tidak cukup — ini perilaku BENAR`.
- **Verifikasi:** Test lulus dengan `ok 10`.

---

### [QA] · Lapisan 2 · Entri 3
- **Konteks:** Membuat uji rebutan untuk membuktikan sistem tidak oversell saat 300 permintaan dikirim bersamaan ke stok 100.
- **Prompt:** *"Buat uji yang menembakkan 300 permintaan POST /orders bersamaan lalu cek apakah sisa stok negatif atau terjual melebihi stok"*
- **Diterima:** Penggunaan `Promise.all(Array.from({ length: PENYERBU }, kirim))` — ini benar-benar paralel, bukan loop berurutan. Juga assertion `sukses <= stokTersedia` dan `sisaStok >= 0`.
- **Ditolak:** Copilot menyarankan menambahkan `await` di dalam loop `for...of` sebagai alternatif. Ditolak karena loop `await` bersifat berurutan (sequential), bukan paralel — tidak akan menghasilkan kondisi race condition yang ingin diuji.
- **Verifikasi:** `node --test tests/rebutan.test.js` → pass 1, fail 0. sukses=0, ditolak=300, sisa=0 (tidak minus).

---

### [QA] · Lapisan 2 · Entri 4
- **Konteks:** Membuat script load test menggunakan autocannon sebagai modul Node (bukan CLI) karena PowerShell memiliki masalah escaping karakter JSON di argumen.
- **Prompt:** *"Buat script node yang menjalankan autocannon programatik untuk POST /orders dengan body JSON dan mencetak p50, p95, p99, throughput, non-2xx"*
- **Diterima:** Penggunaan `autocannon(opts, callback)` dengan `autocannon.track(inst)` untuk progress bar.
- **Ditolak:** Copilot menyarankan menggunakan `async/await` dengan `autocannon` langsung sebagai Promise. Ditolak karena versi autocannon yang terinstall (v8) menggunakan callback pattern; promise wrapper perlu dibuat manual menggunakan `new Promise()`.
- **Verifikasi:** `node tests/loadtest.js` menghasilkan angka baseline yang valid.

---

### [QA] · Lapisan 3 · Entri 5
- **Konteks:** Menyusun kerangka LAPORAN.md sesuai format wajib tiga lapisan.
- **Prompt:** *"Susun kerangka LAPORAN.md untuk sistem Live Shopping Kosmetik dengan tiga lapisan: Microservices, Scalable, Mobile"*
- **Diterima:** Struktur heading H1-H3 dan tabel sebelum-sesudah — sesuai format panduan.
- **Ditolak:** Copilot mengisi angka p95 dan throughput dengan nilai perkiraan ("kira-kira 200ms"). Ditolak — semua angka di laporan harus berasal dari pengukuran nyata `loadtest.js`, bukan estimasi. Kolom diisi ulang manual dari output aktual.
- **Verifikasi:** Angka di laporan dicocokkan satu per satu dengan output `node tests/loadtest.js`.
