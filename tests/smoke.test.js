/**
 * smoke.test.js — Lapisan 1: Uji Asap Microservices
 * Tema: Live Shopping & Flash Sale Kosmetik — Kelompok 6
 *
 * Menguji bahwa tiap service hidup dan endpoint kritis
 * membalas kode HTTP yang benar.
 *
 * Jalankan:
 *   docker compose up -d --build
 *   node --test tests/smoke.test.js
 */

const { test } = require("node:test");
const assert   = require("node:assert/strict");

const CATALOG = process.env.CATALOG_URL || "http://localhost:3005";
const STOCK   = process.env.STOCK_URL   || "http://localhost:3006";
const ORDER   = process.env.ORDER_URL   || "http://localhost:3007";
const LIVE    = process.env.LIVE_URL    || "http://localhost:3008";

// ════════════════════════════════════════════════════
// CATALOG SERVICE (port 3005)
// ════════════════════════════════════════════════════

test("catalog: GET /health → 200 ok", async () => {
  const res  = await fetch(`${CATALOG}/health`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.status, "ok");
});

test("catalog: GET /products → 200, array data", async () => {
  const res  = await fetch(`${CATALOG}/products`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(body.data), "body.data harus array");
  assert.ok(body.data.length > 0, "harus ada minimal 1 produk");
});

test("catalog: GET /products/:id valid → 200", async () => {
  const res  = await fetch(`${CATALOG}/products/1`);
  assert.equal(res.status, 200);
});

test("catalog: GET /products/:id tidak ada → 404", async () => {
  const res = await fetch(`${CATALOG}/products/99999`);
  assert.equal(res.status, 404);
});

test("catalog: POST /products tanpa name → 400", async () => {
  const res = await fetch(`${CATALOG}/products`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ category: "Lip Cream", normal_price: 50000 }),
  });
  assert.equal(res.status, 400);
});

// ════════════════════════════════════════════════════
// STOCK SERVICE (port 3006)
// ════════════════════════════════════════════════════

test("stock: GET /health → 200 ok", async () => {
  const res  = await fetch(`${STOCK}/health`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.status, "ok");
});

test("stock: GET /stock → 200, array data", async () => {
  const res  = await fetch(`${STOCK}/stock`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(body.data));
});

test("stock: GET /stock/:productId valid → 200", async () => {
  const res = await fetch(`${STOCK}/stock/1`);
  assert.equal(res.status, 200);
});

test("stock: GET /stock/:productId tidak ada → 404", async () => {
  const res = await fetch(`${STOCK}/stock/99999`);
  assert.equal(res.status, 404);
});

test("stock: PUT /stock/:id/reduce stok tidak cukup → 409", async () => {
  const res = await fetch(`${STOCK}/stock/1/reduce`, {
    method:  "PUT",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ amount: 999999 }),
  });
  // 409 = stok tidak cukup — ini perilaku BENAR, bukan error
  assert.equal(res.status, 409);
});

// ════════════════════════════════════════════════════
// ORDER SERVICE (port 3007)
// ════════════════════════════════════════════════════

test("order: GET /health → 200 ok", async () => {
  const res  = await fetch(`${ORDER}/health`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.status, "ok");
});

test("order: POST /orders yang sah → 201", async () => {
  const res = await fetch(`${ORDER}/orders`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      customer_name:  "Uji Asap",
      customer_email: "uji@test.com",
      items: [{ product_id: 3, qty: 1 }],  // produk 3, stok cukup
    }),
  });
  assert.equal(res.status, 201);
});

test("order: POST /orders tanpa items → 400", async () => {
  const res = await fetch(`${ORDER}/orders`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ customer_name: "Uji", customer_email: "uji@test.com" }),
  });
  assert.equal(res.status, 400);
});

test("order: POST /orders tanpa customer_name → 400", async () => {
  const res = await fetch(`${ORDER}/orders`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ customer_email: "uji@test.com", items: [{ product_id: 1, qty: 1 }] }),
  });
  assert.equal(res.status, 400);
});

test("order: GET /orders/:id tidak ada → 404", async () => {
  const res = await fetch(`${ORDER}/orders/99999`);
  assert.equal(res.status, 404);
});

// ════════════════════════════════════════════════════
// LIVE SERVICE (port 3008)
// ════════════════════════════════════════════════════

test("live: GET /health → 200 ok", async () => {
  const res  = await fetch(`${LIVE}/health`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.status, "ok");
});

test("live: GET /sessions → 200, array data", async () => {
  const res  = await fetch(`${LIVE}/sessions`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(body.data));
});

test("live: POST /sessions yang sah → 201", async () => {
  const res = await fetch(`${LIVE}/sessions`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ title: "Sesi Uji Asap", promo_duration_sec: 60 }),
  });
  assert.equal(res.status, 201);
});

test("live: GET /sessions/:id tidak ada → 404", async () => {
  const res = await fetch(`${LIVE}/sessions/99999`);
  assert.equal(res.status, 404);
});
