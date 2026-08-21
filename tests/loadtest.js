/**
 * loadtest.js — Load Test Baseline
 * Tema: Live Shopping — Kelompok 6
 * Jalankan: node tests/loadtest.js
 */
const autocannon = require('autocannon');

const BASE_ORDER = process.env.ORDER_URL || 'http://localhost:3007';
const BASE_CATALOG = process.env.CATALOG_URL || 'http://localhost:3005';

const body = JSON.stringify({
  customer_name:  'LoadTest',
  customer_email: 'load@test.com',
  items: [{ product_id: 1, qty: 1 }],
});

async function run(label, opts) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`LOAD TEST: ${label}`);
  console.log('='.repeat(60));
  return new Promise((resolve) => {
    const inst = autocannon({ ...opts, setupClient: undefined }, (err, result) => {
      if (err) { console.error(err); resolve(null); return; }
      const lat = result.latency;
      const req = result.requests;
      console.log(`Requests  : ${result.requests.total} total`);
      console.log(`Throughput: ${req.average.toFixed(1)} req/s`);
      console.log(`Latency p50  : ${lat.p50} ms`);
      console.log(`Latency p95  : ${lat.p95} ms`);
      console.log(`Latency p99  : ${lat.p99} ms`);
      console.log(`Non-2xx errors: ${result.non2xx}`);
      console.log(`Errors    : ${result.errors}`);
      resolve(result);
    });
    autocannon.track(inst);
  });
}

(async () => {
  // ── Test 1: GET /products (catalog-service) ────────────────
  const r1 = await run('GET /products — catalog-service', {
    url:         `${BASE_CATALOG}/products`,
    connections: 100,
    amount:      2000,
    method:      'GET',
  });

  // ── Test 2: POST /orders (order-service) — skenario Live Shopping
  // Sesuai panduan: -c 200 -a 3000 POST /orders
  const r2 = await run('POST /orders — order-service (skenario Live Shopping)', {
    url:         `${BASE_ORDER}/orders`,
    connections: 200,
    amount:      3000,
    method:      'POST',
    headers:     { 'content-type': 'application/json' },
    body,
  });

  // ── Ringkasan untuk laporan ────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('RINGKASAN UNTUK TABEL LAPORAN');
  console.log('='.repeat(60));
  console.log('Perubahan          | Perintah                  | p95    | Throughput | Non-2xx');
  console.log('-------------------|---------------------------|--------|------------|--------');
  if (r1) console.log(`GET /products      | -c100 -a2000 GET /products| ${r1.latency.p95} ms | ${r1.requests.average.toFixed(0)} req/s | ${r1.non2xx}`);
  if (r2) console.log(`POST /orders (base)| -c200 -a3000 POST /orders | ${r2.latency.p95} ms | ${r2.requests.average.toFixed(0)} req/s | ${r2.non2xx}`);
})();
