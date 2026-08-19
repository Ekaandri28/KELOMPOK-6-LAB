# Dokumentasi Arsitektur & Alur Sistem — Live Shopping Kosmetik

Dokumen ini memuat diagram alur (*flowchart*) integrasi antara **Alur Admin Stok** dan **Alur Pelanggan (Live Shopping & Purchase)**.

```mermaid
graph TD
    %% ==================== ALUR ADMIN STOK ====================
    subgraph Alur_Admin ["🏢 ALUR ADMIN STOK"]
        A1([Mulai]) --> A2[/INPUT DATA LOGIN ADMIN<br/>username/password/]
        A2 --> A3{Validasi Login Admin?}
        A3 -->|Tidak| A2
        A3 -->|Ya| A4[Dasbor Admin Stok]
        
        A4 --> A5["Kelola Stok Kosmetik<br/>(Tambah/Perbarui Produk)"]
        A4 --> A6["Atur Jadwal Live & Flash Sale"]
        
        A5 --> DB_Stok[(Database Stok & Jadwal Terupdate)]
        A6 --> DB_Stok
        DB_Stok -->|Terhubung ke Database Stok| A4
    end

    %% ==================== ALUR PELANGGAN ====================
    subgraph Alur_Pelanggan ["💄 ALUR PELANGGAN & LIVE SHOPPING"]
        U1([Mulai]) --> U2[/INPUT DATA LOGIN PELANGGAN<br/>email/password/]
        U2 --> U3{Validasi Login Pelanggan?}
        
        U3 -->|No| E_Login[Tampilkan Kesalahan Login]
        U3 -->|Ya| U4[Dasbor Pelanggan]
        
        U4 --> U5[Tonton Live & Lihat Produk]
        U5 --> U6[Masuk ke Live Shopping Kosmetik]
        
        U6 --> Q1{Tambahkan Produk ke Keranjang?}
        
        Q1 -->|Ya| Cart[Tampilkan Keranjang Belanja]
        Cart --> Checkout[Lanjutkan ke Check-out]
        
        Q1 -->|No| Q2{Stok Kosmetik Tersedia?}
        Q2 -->|No| E_Stock[Batal Pesanan karena Stok Habis]
        Q2 -->|Ya| PayProcess[Proses Pembayaran]
        
        Checkout --> SysCheck[Sistem Memeriksa Ketersediaan Stok Kosmetik]
        
        SysCheck --> Payment["Kirim Permintaan ke Payment Gateway<br/>(Opsi Bank/Dompet)"]
        Payment --> Q3{Pembayaran Berhasil?}
        
        Q3 -->|No| E_Pay[Tampilkan Pembayaran]
        Q3 -->|Ya| Order1[Buat Pesanan & Kurangi Stok]
        PayProcess --> Order1
        
        Order1 --> DB_Stok
        Order1 --> DB_Order[(Database Pesanan Pelanggan)]
        
        DB_Order --> Confirmed[Tampilkan Pesanan Dikonfirmasi]
        Confirmed --> End([Selesai])
    end

    %% Integrasi Sistem
    DB_Stok -.-|Titik Integrasi Kritis| SysCheck
```

---

## Ringkasan Titik Integrasi Kritis (Architecture Decision)

1. **Sinkronisasi Stok Real-Time:** `Sistem Memeriksa Ketersediaan Stok Kosmetik` terhubung langsung ke `Database Stok & Jadwal Terupdate` milik Admin untuk mencegah *overselling* saat Flash Sale.
2. **Pemisahan Database (CQRS/Isolation):** Transaksi yang berhasil akan langsung memperbarui `Database Stok Admin` sekaligus mencatat histori transaksi di `Database Pesanan Pelanggan`.
