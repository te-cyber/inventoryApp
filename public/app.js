/* global state */
let currentEditId = null;
let currentDeleteId = null;

/* ============================
   Utility: Toast
   ============================ */
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast toast-${type}`;
  setTimeout(() => { t.className = 'toast hidden'; }, 3000);
}

/* ============================
   Utility: Format
   ============================ */
function fmtPrice(p) {
  return '$' + parseFloat(p).toFixed(2);
}

function stockStatus(qty) {
  if (qty === 0) return { label: 'Out of Stock', cls: 'status-out-of-stock', dot: '🔴' };
  if (qty <= 10) return { label: 'Low Stock', cls: 'status-low-stock', dot: '🟡' };
  return { label: 'In Stock', cls: 'status-in-stock', dot: '🟢' };
}

/* ============================
   Load & Render Products
   ============================ */
async function loadProducts() {
  const search = document.getElementById('searchInput').value.trim();
  const category = document.getElementById('categoryFilter').value;
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category && category !== 'All') params.set('category', category);

  const res = await fetch(`/api/products?${params}`);
  const products = await res.json();
  renderTable(products);
  updateHeaderStats(products);
}

function renderTable(products) {
  const tbody = document.getElementById('productsBody');
  const empty = document.getElementById('emptyState');
  const tableWrapper = document.getElementById('tableWrapper');

  if (products.length === 0) {
    tableWrapper.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  tableWrapper.classList.remove('hidden');
  empty.classList.add('hidden');

  tbody.innerHTML = products.map(p => {
    const status = stockStatus(p.quantity);
    return `
      <tr>
        <td class="td-sku">${escHtml(p.sku)}</td>
        <td class="td-name">${escHtml(p.name)}</td>
        <td><span class="category-badge">${escHtml(p.category)}</span></td>
        <td class="td-price">${fmtPrice(p.price)}</td>
        <td class="td-qty">${p.quantity}</td>
        <td><span class="status-badge ${status.cls}">${status.dot} ${status.label}</span></td>
        <td>
          <div class="actions-cell">
            <button class="btn btn-icon btn-edit" onclick="openEditModal(${p.id}, ${p.quantity}, '${escHtml(p.name).replace(/'/g, "\\'")}')">✏️ Edit Qty</button>
            <button class="btn btn-icon btn-del" onclick="openDeleteModal(${p.id}, '${escHtml(p.name).replace(/'/g, "\\'")}')">🗑️ Delete</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function updateHeaderStats(products) {
  const total = products.length;
  const outOfStock = products.filter(p => p.quantity === 0).length;
  const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= 10).length;
  const inStock = products.filter(p => p.quantity > 10).length;
  document.getElementById('headerStats').innerHTML = `
    <div class="stat-item"><span class="stat-label">Products:</span><span class="stat-value">${total}</span></div>
    <div class="stat-item"><span class="stat-label">Low Stock:</span><span class="stat-value">${lowStock}</span></div>
    <div class="stat-item"><span class="stat-label">Out of Stock:</span><span class="stat-value">${outOfStock}</span></div>
  `;
  // Update stat cards
  const cardTotal = document.getElementById('cardTotal');
  const cardInStock = document.getElementById('cardInStock');
  const cardLow = document.getElementById('cardLow');
  const cardOut = document.getElementById('cardOut');
  if (cardTotal) cardTotal.textContent = total;
  if (cardInStock) cardInStock.textContent = inStock;
  if (cardLow) cardLow.textContent = lowStock;
  if (cardOut) cardOut.textContent = outOfStock;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ============================
   Load Categories
   ============================ */
async function loadCategories() {
  const res = await fetch('/api/categories');
  const cats = await res.json();
  const sel = document.getElementById('categoryFilter');
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });
  // datalist for add form
  const dl = document.getElementById('categoryOptions');
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    dl.appendChild(opt);
  });
}

/* ============================
   Add Product Modal
   ============================ */
document.getElementById('addProductBtn').addEventListener('click', () => {
  document.getElementById('addProductForm').reset();
  document.getElementById('addError').classList.add('hidden');
  document.getElementById('addModal').classList.remove('hidden');
});

function closeAddModal() {
  document.getElementById('addModal').classList.add('hidden');
}

document.getElementById('closeAddModal').addEventListener('click', closeAddModal);
document.getElementById('cancelAddModal').addEventListener('click', closeAddModal);
document.getElementById('addModalOverlay').addEventListener('click', closeAddModal);

document.getElementById('addProductForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('addError');
  errEl.classList.add('hidden');
  const body = {
    name: document.getElementById('newName').value.trim(),
    sku: document.getElementById('newSku').value.trim(),
    category: document.getElementById('newCategory').value.trim(),
    price: document.getElementById('newPrice').value,
    quantity: document.getElementById('newQuantity').value,
  };
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.ok) {
    closeAddModal();
    showToast('✅ Product added successfully!');
    loadCategories_refresh();
    loadProducts();
  } else {
    const data = await res.json();
    errEl.textContent = data.error || 'Failed to add product.';
    errEl.classList.remove('hidden');
  }
});

async function loadCategories_refresh() {
  const res = await fetch('/api/categories');
  const cats = await res.json();
  const sel = document.getElementById('categoryFilter');
  const currentVal = sel.value;
  // remove non-All options
  while (sel.options.length > 1) sel.remove(1);
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });
  sel.value = currentVal;
  const dl = document.getElementById('categoryOptions');
  dl.innerHTML = '';
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    dl.appendChild(opt);
  });
}

/* ============================
   Edit Quantity Modal
   ============================ */
function openEditModal(id, quantity, name) {
  currentEditId = id;
  document.getElementById('editProductName').textContent = name;
  document.getElementById('editQuantity').value = quantity;
  document.getElementById('editError').classList.add('hidden');
  document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
  currentEditId = null;
}

document.getElementById('closeEditModal').addEventListener('click', closeEditModal);
document.getElementById('cancelEditModal').addEventListener('click', closeEditModal);
document.getElementById('editModalOverlay').addEventListener('click', closeEditModal);

document.getElementById('qtyMinus').addEventListener('click', () => {
  const inp = document.getElementById('editQuantity');
  inp.value = Math.max(0, parseInt(inp.value || 0, 10) - 1);
});

document.getElementById('qtyPlus').addEventListener('click', () => {
  const inp = document.getElementById('editQuantity');
  inp.value = parseInt(inp.value || 0, 10) + 1;
});

document.getElementById('editQuantityForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('editError');
  errEl.classList.add('hidden');
  const quantity = parseInt(document.getElementById('editQuantity').value, 10);
  const res = await fetch(`/api/products/${currentEditId}/quantity`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });
  if (res.ok) {
    closeEditModal();
    showToast('✅ Quantity updated!');
    loadProducts();
  } else {
    const data = await res.json();
    errEl.textContent = data.error || 'Failed to update quantity.';
    errEl.classList.remove('hidden');
  }
});

/* ============================
   Delete Modal
   ============================ */
function openDeleteModal(id, name) {
  currentDeleteId = id;
  document.getElementById('deleteProductName').textContent = name;
  document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.add('hidden');
  currentDeleteId = null;
}

document.getElementById('closeDeleteModal').addEventListener('click', closeDeleteModal);
document.getElementById('cancelDeleteModal').addEventListener('click', closeDeleteModal);
document.getElementById('deleteModalOverlay').addEventListener('click', closeDeleteModal);

document.getElementById('confirmDelete').addEventListener('click', async () => {
  const res = await fetch(`/api/products/${currentDeleteId}`, { method: 'DELETE' });
  if (res.ok) {
    closeDeleteModal();
    showToast('🗑️ Product deleted.', 'error');
    loadCategories_refresh();
    loadProducts();
  }
});

/* ============================
   Search & Filter
   ============================ */
document.getElementById('searchInput').addEventListener('input', debounce(loadProducts, 300));
document.getElementById('categoryFilter').addEventListener('change', loadProducts);

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

/* ============================
   Init
   ============================ */
(async () => {
  await loadCategories();
  await loadProducts();
})();
