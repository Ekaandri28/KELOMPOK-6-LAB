/**
 * rebutan.test.js — Lapisan 2: Uji Rebutan (Oversell Prevention)
 * Tema: Live Shopping & Flash Sale Kosmetik — Kelompok 6
 *
 * Membuktikan bahwa stok tidak bisa terjual melebihi jumlah yang ada
 * walau ratusan permintaan dikirim bersamaan (Promise.all = benar-benar paralel).
 *
 * Jalankan:
 *   node --test tests/rebutan.test.js
 */

const { test } = require("node:test");
const assert   = require("node:assert/strict");

const ORDER = process.env.ORDER_URL || "http://localhost:3007";
const STOCK = process.env.STOCK_URL || "http://localhost:3006";

const PRODUCT_ID = 3;   // produk 3 — stok awal 83, aman untuk diuji
const STOK_UJI   = 50;  // reset ke nilai ini sebelum serangan
const PENYERBU   = 150; // 3x lipat stok — memastikan ada yang ditolak

test(`stok ${STOK_UJI} diserbu ${PENYERBU} permintaan bersamaan — tidak boleh oversell`, async (t) => {

  // ── Reset stok ke nilai yang diketahui sebelum serangan ──────
  // Ambil stok saat ini, lalu restore sampai = STOK_UJI
  const stokAwalRes  = await fetch(`${STOCK}/stock/${PRODUCT_ID}`);
  const stokAwalBody = await stokAwalRes.json();
  const stokSaatIni  = stokAwalBody.data?.quantity ?? 0;

  if (stokSaatIni < STOK_UJI) {
    const selisih = STOK_UJI - stokSaatIni;
    await fetch(`${STOCK}/stock/${PRODUCT_ID}/restore`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ amount: selisih }),
    });
    t.diagnostic(`Stok di-restore: ${stokSaatIni} → ${STOK_UJI}`);
  } else if (stokSaatIni > STOK_UJI) {
    const selisih = stokSaatIni - STOK_UJI;
    await fetch(`${STOCK}/stock/${PRODUCT_ID}/reduce`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ amount: selisih }),
    });
    t.diagnostic(`Stok dikurangi: ${stokSaatIni} → ${STOK_UJI}`);
  }

  t.diagnostic(`Stok sebelum serangan: ${STOK_UJI}`);

  // ── Tembakkan semua permintaan BERSAMAAN (Promise.all) ───────
  const kirim = () => fetch(`${ORDER}/orders`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      customer_name:  "Penyerbu",
      customer_email: "serbu@test.com",
      items: [{ product_id: PRODUCT_ID, qty: 1 }],
    }),
  }).then(r => r.status);

  const semuaStatus = await Promise.all(
    Array.from({ length: PENYERBU }, kirim)
  );

  const sukses   = semuaStatus.filter(s => s === 201).length;
  const ditolak  = semuaStatus.filter(s => s === 409).length;
  const error5xx = semuaStatus.filter(s => s >= 500).length;

  t.diagnostic(`sukses (201)             = ${sukses}`);
  t.diagnostic(`ditolak stok habis (409) = ${ditolak}  ← perilaku BENAR`);
  t.diagnostic(`error server (5xx)       = ${error5xx}`);

  // Cek stok akhir
  const stokAkhirRes  = await fetch(`${STOCK}/stock/${PRODUCT_ID}`);
  const stokAkhirBody = await stokAkhirRes.json();
  const sisaStok      = stokAkhirBody.data?.quantity ?? -1;

  t.diagnostic(`Sisa stok setelah serangan: ${sisaStok}`);

  // ── Assertions ───────────────────────────────────────────────
  assert.ok(sisaStok >= 0,
    `OVERSELL TERDETEKSI: sisa stok minus (${sisaStok})`);

  assert.ok(sukses <= STOK_UJI,
    `OVERSELL TERDETEKSI: terjual ${sukses} > stok ${STOK_UJI}`);

  assert.equal(error5xx, 0,
    `Ada ${error5xx} error server (5xx) — sistem tidak stabil`);

  assert.equal(sukses + ditolak + error5xx, PENYERBU,
    "Jumlah respons tidak sama dengan jumlah permintaan yang dikirim");
});
