# Dokumentasi Arsitektur Sistem — Live Shopping Kosmetik

Dokumen ini berisi diagram alur interaksi antara **Admin Stok** dan **Pelanggan** pada sistem *Live Shopping & Flash Sale* Produk Kosmetik.

## Diagram Alur Sistem (Flowchart)

```mermaid
graph TD
    subgraph Admin_Stok ["🏢 ALUR ADMIN STOK"]
        A1([Mulai]) --> A2[Input Data Login Admin]
        A2 --> A3{Validasi Login?}
        A3 -->|Tidak| A2
        A3 -->|Ya| A4[Dasbor Admin Stok]
        A4 --> A5[Kelola Stok Kosmetik]
        A4 --> A6[Atur Jadwal Live & Flash Sale]
        A5 --> DB_Stock[(Database Stok Kosmetik)]
        A6 --> DB_Stock
    end

    subgraph Pelanggan ["💄 ALUR PELANGGAN"]
        U1([Mulai]) --> U2[Input Data Login Pelanggan]
        U2 --> U3{Validasi Login?}
        U3 -->|Tidak| U2
        U3 -->|Ya| U4[Dasbor Pelanggan & Tonton Live]
        U4 --> U5[Lihat Etalase Produk Live]
        U5 --> U6[Beli Sekarang / Tambah Keranjang]
        U6 --> U7[Checkout]
        U7 --> C1{Cek Stok Real-Time}
        C1 -->|Stok Habis| E1[Notifikasi Stok Habis]
        C1 -->|Stok Ada| P1[Proses Payment Gateway]
        P1 --> P2{Pembayaran Berhasil?}
        P2 -->|Gagal| E2[Transaksi Batal]
        P2 -->|Ya| O1[Buat Pesanan & Potong Stok]
        O1 --> DB_Stock
        O1 --> DB_Order[(Database Pesanan)]
        DB_Order --> S1([Pesanan Dikonfirmasi])
    end
```
