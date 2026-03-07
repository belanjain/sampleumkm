/* ============================================================
   WAROENG MAMA CIA – script.js
   Struktur file:
   1. Konfigurasi (nomor WA, Google Sheets URL, dll)
   2. State Keranjang
   3. Helper Functions
   4. Fetch & Parse Data dari Google Sheets
   5. Render Kartu Menu
   6. Logika Keranjang
   7. Logika WhatsApp
   8. Init (jalankan saat halaman load)
   ============================================================ */


/* ============================================================
   1. KONFIGURASI
   Ubah di sini untuk custom dasar tanpa perlu cari-cari
   ============================================================ */
const CONFIG = {
  WA_NUMBER:     '6285714218798',
  WA_GREETING:   'Halo Mama Cia! Saya mau pesan:',
  WA_DIRECT_MSG: 'Halo Mama Cia! Saya mau tanya-tanya dulu 😊',

  // ⬇️ Ganti link ini kalau ganti Google Sheets klien
  // Cara dapet link: File → Share → Publish to web → CSV → Copy link
  SHEETS_CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTqKsKeqaF9qa2dF5yLMsLPWK2kLnLPY9c_kJJRiAqEp51pogSoFr2KScMFUIGi0dBFSmdIDpDRjgu_/pub?gid=1390740499&single=true&output=csv',
};


/* ============================================================
   2. STATE KERANJANG
   Format: { "Nama Produk": { price: 5000, qty: 2 }, ... }
   ============================================================ */
let cart = {};


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
 * Baris pertama = header kolom
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    // Handle nilai yang mengandung koma di dalam tanda kutip
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
  }).filter(row => row.name); // buang baris kosong
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
   4. FETCH & PARSE DATA DARI GOOGLE SHEETS
   ============================================================ */

async function fetchMenuFromSheets() {
  // Tampilkan loading sementara data diambil
  document.getElementById('snack-grid').innerHTML = '<p class="loading">Memuat menu... 🍳</p>';
  document.getElementById('drink-grid').innerHTML = '<p class="loading">Memuat menu... 🥤</p>';

  try {
    const response = await fetch(CONFIG.SHEETS_CSV_URL);
    if (!response.ok) throw new Error('Gagal fetch');

    const csvText = await response.text();
    const allItems = parseCSV(csvText);

    // Pisahkan berdasarkan kolom `category`
    const snacks = allItems.filter(item => item.category?.toLowerCase() === 'snack');
    const drinks = allItems.filter(item => item.category?.toLowerCase() === 'drink');
    const jasa = allItems.filter(item => item.category?.toLowerCase() === 'jasa');


    renderGrid(snacks, 'snack-grid');
    renderGrid(drinks, 'drink-grid');
    renderGrid(jasa, 'jasa-grid');

  } catch (error) {
    console.error('Error:', error);
    document.getElementById('snack-grid').innerHTML = '<p class="loading">⚠️ Gagal memuat menu. Coba refresh.</p>';
    document.getElementById('drink-grid').innerHTML = '';
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
      ? `<img class="card-img" src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">`
      : `<div class="card-emoji">${item.image || '🍽️'}</div>`;

    card.innerHTML = `
      ${mediaHTML}
      <div class="card-name">${item.name}</div>
      <div class="card-price">${formatRupiah(item.price)}</div>
      <button
        class="card-add"
        id="btn-${gridId}-${index}"
        onclick="tambahKeKeranjang('${item.name.replace(/'/g, "\\'")}', ${item.price}, '${gridId}', ${index})"
      >+ Tambah</button>
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

  const tombol = document.getElementById(`btn-${gridId}-${index}`);
  tombol.textContent = `✓ ${cart[namaItem].qty}x`;
  tombol.classList.add('added');

  updateCartBar();
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
  document.getElementById('wa-direct').href = url;
  document.getElementById('wa-float').href  = url;
}


/* ============================================================
   8. INIT
   ============================================================ */
async function init() {
  setupTombolWALangsung();
  await fetchMenuFromSheets();
}

document.addEventListener('DOMContentLoaded', init);
