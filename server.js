const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: read DB
function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

// Helper: write DB
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// GET all products (with optional search/filter)
app.get('/api/products', (req, res) => {
  let products = readDB();
  const { search, category } = req.query;
  if (search) {
    const s = search.toLowerCase();
    products = products.filter(
      p => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s)
    );
  }
  if (category && category !== 'All') {
    products = products.filter(p => p.category === category);
  }
  res.json(products);
});

// GET categories
app.get('/api/categories', (req, res) => {
  const products = readDB();
  const categories = [...new Set(products.map(p => p.category))].sort();
  res.json(categories);
});

// POST add product
app.post('/api/products', (req, res) => {
  const { name, category, sku, price, quantity } = req.body;
  if (!name || !category || !sku || price == null || quantity == null) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  const products = readDB();
  if (products.find(p => p.sku === sku)) {
    return res.status(400).json({ error: 'SKU must be unique.' });
  }
  const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
  const product = { id: newId, name, category, sku, price: parseFloat(price), quantity: parseInt(quantity, 10) };
  products.push(product);
  writeDB(products);
  res.status(201).json(product);
});

// PATCH update quantity
app.patch('/api/products/:id/quantity', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { quantity } = req.body;
  if (quantity == null || isNaN(parseInt(quantity, 10))) {
    return res.status(400).json({ error: 'Quantity is required.' });
  }
  const products = readDB();
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found.' });
  products[idx].quantity = Math.max(0, parseInt(quantity, 10));
  writeDB(products);
  res.json(products[idx]);
});

// DELETE product
app.delete('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const products = readDB();
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found.' });
  products.splice(idx, 1);
  writeDB(products);
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`Inventory app running at http://localhost:${PORT}`);
});

module.exports = app;
