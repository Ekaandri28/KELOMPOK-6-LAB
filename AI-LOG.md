# Log Penggunaan AI — Kelompok 6 LAB

### Pertemuan 1 — MUH. EKA ANDRI SETIAWAN (Ekaandri28)

#### Entri 1
- **Konteks**: Membuat layanan `catalog` berbasis Express.js.
- **Prompt**: "Buat server Express di index.js dengan endpoint GET /items dan GET /health di port 3001."
- **Diterima**: Struktur routing Express lengkap untuk `/items` dan `/health`.
- **Ditolak & alasan**: Port `3001` ditolak karena bentrok (`EADDRINUSE`) dengan aplikasi `app1`. Port diubah secara manual menjadi `3005` agar server dapat berjalan lancar.
- **Verifikasi**: `curl -s http://localhost:3005/health` merespons JSON status OK dan `/items` menampilkan array produk kosmetik.

#### Entri 2
- **Konteks**: Pemodelan Bounded Context (DDD) dan Context Map pada `docs/ARSITEKTUR.md`.
- **Prompt**: "Buat dokumen arsitektur DDD untuk tema Live Shopping & Flash Sale."
- **Diterima**: Pemetaan 4 layanan utama (`catalog`, `stock`, `order`, `live`) beserta tanggung jawab dan alur interaksinya.
- **Ditolak & alasan**: Saran untuk menambahkan layanan skema pembayaran kompleks ditolak agar ruang lingkup tetap fokus pada 4 layanan utama sesuai spesifikasi praktikum.
- **Verifikasi**: Berkas berhasil disimpan di `docs/ARSITEKTUR.md` dengan format tabel Markdown yang valid.

#### Entri 3
- **Konteks**: Pembuatan spesifikasi kontrak API pada `openapi.yaml`.
- **Prompt**: "Buat kerangka OpenAPI 3.0.3 untuk layanan catalog."
- **Diterima**: Struktur YAML untuk `servers`, `/items`, dan `/health`.
- **Ditolak & alasan**: Karakter indentasi Tab dari saran awal dibersihkan dan diganti dengan 2 spasi konsisten agar tidak merusak parser YAML.
- **Verifikasi**: File `openapi.yaml` lolos validasi struktur YAML dan berhasil di-commit.
