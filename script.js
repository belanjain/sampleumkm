/* ============================================================
   WAROENG SUKA SUKA – script.js
   Struktur file:
   1. Konfigurasi (nomor WA, Google Sheets URL, dll)
   2. State Keranjang
   3. Helper Functions
   4. Fetch & Parse Data dari Google Sheets (+ Cache)
   5. Render Kartu Menu
   6. Logika Keranjang
   7. Logika WhatsApp
   8. Init (jalankan saat halaman load)
   ============================================================ */


/* ============================================================
   1. KONFIGURASI
   ============================================================ */
const CONFIG = {
  WA_NUMBER:     '6285126470047',
  WA_GREETING:   'Halo Ka! Saya mau pesan:',
  WA_DIRECT_MSG: 'Halo Ka! Saya mau tanya-tanya dulu 😊',

  // ⬇️ Ganti link ini kalau ganti Google Sheets klien
  SHEETS_CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTqKsKeqaF9qa2dF5yLMsLPWK2kLnLPY9c_kJJRiAqEp51pogSoFr2KScMFUIGi0dBFSmdIDpDRjgu_/pub?gid=1390740499&single=true&output=csv',

  // Cache: berapa menit data disimpan sebelum fetch ulang dari Sheets
  // Ganti ke 0 kalau mau selalu fetch fresh (tanpa cache)
  CACHE_MINUTES: 10,
};

// Key untuk nyimpen cache di memori (session)
const CACHE_KEY = 'menu_cache';
const CACHE_TIME_KEY = 'menu_cache_time';


/* ============================================================
   2. STATE KERANJANG
   Format: { "Nama Produk": { price: 5000, qty: 2 }, ... }
   ============================================================ */
let cart = {};

// Simpan cache di memori (bukan localStorage)
// Cache hilang kalau tab ditutup — cukup untuk speed up reload dalam sesi yang sama
let memoryCache = {
  data: null,
  timestamp: null,
};


/* ============================================================
   3. HELPER FUNCTIONS
   ============================================================ */

/**
 * Format angka ke Rupiah → 5000 jadi "Rp 5.000"
 */
function formatRupiah(angka) {
  return 'Rp ' + Number(angka).toLocaleString('id-ID');
}

/**
 * Parse CSV string jadi array of objects
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    return obj;
  }).filter(row => row.name);
}

/**
 * Cek apakah cache masih valid (belum expired)
 */
function isCacheValid() {
  if (!memoryCache.data || !memoryCache.timestamp) return false;
  const ageMinutes = (Date.now() - memoryCache.timestamp) / 1000 / 60;
  return ageMinutes < CONFIG.CACHE_MINUTES;
}

/**
 * Buat URL WhatsApp dengan daftar pesanan
 */
function buatUrlWA(pesanHeader) {
  let pesan = pesanHeader + '\n\n';
  let total = 0;

  for (const namaItem in cart) {
    const { price, qty } = cart[namaItem];
    pesan += `• ${namaItem} x${qty} = ${formatRupiah(price * qty)}\n`;
    total += price * qty;
  }

  pesan += `\n*Total: ${formatRupiah(total)}*`;
  pesan += '\n\nMohon konfirmasi pesanan ya kak 🙏';

  return `https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(pesan)}`;
}


/* ============================================================
   4. FETCH & PARSE DATA DARI GOOGLE SHEETS (+ CACHE)
   - Kalau cache masih valid → pakai cache, gak fetch ulang
   - Kalau cache expired/kosong → fetch dari Sheets, simpan ke cache
   ============================================================ */

async function fetchMenuFromSheets() {
  // Tampilkan loading
  document.getElementById('snack-grid').innerHTML = '<p class="loading">Memuat menu... 🍳</p>';
  document.getElementById('drink-grid').innerHTML = '<p class="loading">Memuat menu... 🥤</p>';
  document.getElementById('jasa-grid').innerHTML  = '<p class="loading">Memuat layanan... 🛠️</p>';

  try {
    let allItems;

    if (isCacheValid()) {
      // ✅ Pakai data dari cache — lebih cepet, gak perlu request ke internet
      allItems = memoryCache.data;
    } else {
      // 🌐 Fetch fresh dari Google Sheets
      const response = await fetch(CONFIG.SHEETS_CSV_URL);
      if (!response.ok) throw new Error('Gagal fetch');

      const csvText = await response.text();
      allItems = parseCSV(csvText);

      // Simpan ke cache memori
      memoryCache.data      = allItems;
      memoryCache.timestamp = Date.now();
    }

    // Pisahkan berdasarkan kolom `category`
    const snacks      = allItems.filter(item => item.category?.toLowerCase() === 'snack');
    const drinks      = allItems.filter(item => item.category?.toLowerCase() === 'drink');
    const layananJasa = allItems.filter(item => item.category?.toLowerCase() === 'jasa');

    renderGrid(snacks,      'snack-grid');
    renderGrid(drinks,      'drink-grid');
    renderGrid(layananJasa, 'jasa-grid');

  } catch (error) {
    console.error('Error:', error);
    document.getElementById('snack-grid').innerHTML = '<p class="loading">⚠️ Gagal memuat menu. Coba refresh.</p>';
    document.getElementById('drink-grid').innerHTML = '';
    document.getElementById('jasa-grid').innerHTML  = '';
  }
}


/* ============================================================
   5. RENDER KARTU MENU
   ============================================================ */

function renderGrid(items, gridId) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = '';

  if (items.length === 0) {
    grid.innerHTML = '<p class="loading">Belum ada menu.</p>';
    return;
  }

  items.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'card';

    // Kalau kolom image berisi URL → tampilkan foto, kalau tidak → tampilkan emoji
    const isImage = item.image && item.image.startsWith('http');
    const mediaHTML = isImage
      ? `<img class="card-img" src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.style.display='none'">`
      : `<div class="card-emoji">${item.image || '🍽️'}</div>`;

    card.innerHTML = `
      ${mediaHTML}
      <div class="card-name">${item.name}</div>
      <div class="card-price">${formatRupiah(item.price)}</div>
      <div class="card-counter" id="counter-${gridId}-${index}">
        <button class="card-add" onclick="tambahKeKeranjang('${item.name.replace(/'/g, "\\'")}', ${item.price}, '${gridId}', ${index})">+ Tambah</button>
      </div>
    `;

    grid.appendChild(card);
  });
}


/* ============================================================
   6. LOGIKA KERANJANG
   ============================================================ */

function tambahKeKeranjang(namaItem, harga, gridId, index) {
  if (cart[namaItem]) {
    cart[namaItem].qty += 1;
  } else {
    cart[namaItem] = { price: harga, qty: 1 };
  }
  updateCounter(namaItem, harga, gridId, index);
  updateCartBar();
}

function kurangiDariKeranjang(namaItem, harga, gridId, index) {
  if (!cart[namaItem]) return;
  cart[namaItem].qty -= 1;

  // Kalau qty 0, hapus dari cart
  if (cart[namaItem].qty <= 0) {
    delete cart[namaItem];
  }
  updateCounter(namaItem, harga, gridId, index);
  updateCartBar();
}

/**
 * Update tampilan counter +/- di kartu produk
 * Kalau qty 0 → balik jadi tombol "+ Tambah"
 * Kalau qty > 0 → tampil [ - ] [ qty ] [ + ]
 */
function updateCounter(namaItem, harga, gridId, index) {
  const container = document.getElementById(`counter-${gridId}-${index}`);
  if (!container) return;

  const qty = cart[namaItem]?.qty || 0;
  const safeName = namaItem.replace(/'/g, "\\'");

  if (qty === 0) {
    // Balik ke tombol tambah biasa
    container.innerHTML = `
      <button class="card-add" onclick="tambahKeKeranjang('${safeName}', ${harga}, '${gridId}', ${index})">+ Tambah</button>
    `;
  } else {
    // Tampilkan counter +/-
    container.innerHTML = `
      <div class="qty-control">
        <button class="qty-btn minus" onclick="kurangiDariKeranjang('${safeName}', ${harga}, '${gridId}', ${index})">−</button>
        <span class="qty-num">${qty}</span>
        <button class="qty-btn plus" onclick="tambahKeKeranjang('${safeName}', ${harga}, '${gridId}', ${index})">+</button>
      </div>
    `;
  }
}

function updateCartBar() {
  const cartBar = document.getElementById('cart-bar');
  let totalItem = 0, totalHarga = 0;

  for (const namaItem in cart) {
    totalItem  += cart[namaItem].qty;
    totalHarga += cart[namaItem].price * cart[namaItem].qty;
  }

  document.getElementById('cart-count').textContent = totalItem;
  document.getElementById('cart-total').textContent  = formatRupiah(totalHarga);
  cartBar.classList.toggle('visible', totalItem > 0);
}


/* ============================================================
   7. LOGIKA WHATSAPP
   ============================================================ */

function orderViaWA() {
  window.open(buatUrlWA(CONFIG.WA_GREETING), '_blank');
}

function setupTombolWALangsung() {
  const url = `https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(CONFIG.WA_DIRECT_MSG)}`;
  /* document.getElementById('wa-direct').href = url; -- footer dinonaktifkan */
  document.getElementById('wa-float').href = url;
}


/* ============================================================
   8. INIT
   ============================================================ */
async function init() {
  setupTombolWALangsung();
  await fetchMenuFromSheets();
}

document.addEventListener('DOMContentLoaded', init);
