/**
 * Basic API tests for the inventory app.
 * Run with: node tests/api.test.js
 * Requires the server to be running on port 3000.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';

let passed = 0;
let failed = 0;

function request(method, url, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = http.request(BASE + url, options, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch (_) {}
        resolve({ status: res.statusCode, body: json });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function assert(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function run() {
  console.log('\n🧪 Running Inventory API Tests\n');

  // GET /api/products returns 20 initial products
  {
    const r = await request('GET', '/api/products');
    await assert('GET /api/products returns 200', r.status === 200, `got ${r.status}`);
    await assert('Returns array', Array.isArray(r.body), typeof r.body);
    await assert('Has 20 initial products', r.body.length >= 20, `got ${r.body ? r.body.length : 0}`);
  }

  // GET /api/categories
  {
    const r = await request('GET', '/api/categories');
    await assert('GET /api/categories returns 200', r.status === 200);
    await assert('Returns array of categories', Array.isArray(r.body));
  }

  // POST /api/products - add new product
  let newId;
  {
    const body = { name: 'Test Widget', sku: 'TEST-999', category: 'Test', price: 9.99, quantity: 5 };
    const r = await request('POST', '/api/products', body);
    await assert('POST /api/products returns 201', r.status === 201, `got ${r.status}`);
    await assert('Returned product has id', r.body && r.body.id != null);
    newId = r.body && r.body.id;
  }

  // POST duplicate SKU returns 400
  {
    const body = { name: 'Dup SKU', sku: 'TEST-999', category: 'Test', price: 1.0, quantity: 1 };
    const r = await request('POST', '/api/products', body);
    await assert('Duplicate SKU returns 400', r.status === 400, `got ${r.status}`);
  }

  // PATCH /api/products/:id/quantity
  if (newId != null) {
    const r = await request('PATCH', `/api/products/${newId}/quantity`, { quantity: 42 });
    await assert('PATCH quantity returns 200', r.status === 200);
    await assert('Updated quantity is 42', r.body && r.body.quantity === 42, `got ${r.body && r.body.quantity}`);
  }

  // Search filter
  {
    const r = await request('GET', '/api/products?search=mouse');
    await assert('Search filter works', r.status === 200 && Array.isArray(r.body));
    await assert('Search "mouse" finds results', r.body && r.body.length > 0);
  }

  // DELETE /api/products/:id
  if (newId != null) {
    const r = await request('DELETE', `/api/products/${newId}`);
    await assert('DELETE returns 204', r.status === 204, `got ${r.status}`);
  }

  // DELETE non-existent returns 404
  {
    const r = await request('DELETE', '/api/products/999999');
    await assert('DELETE non-existent returns 404', r.status === 404);
  }

  console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });
