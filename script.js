/* ============================================================
   WAROENG MAMA CIA – script.js
   Struktur file:
   1. Konfigurasi (nomor WA, dll)
   2. Data Menu (snack & drink)
   3. State Keranjang
   4. Helper Functions
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
  WA_NUMBER:     '6285714218798',       // Nomor WA tanpa + (format internasional)
  WA_GREETING:   'Halo Mama Cia! Saya mau pesan:', // Header pesan WA dari cart
  WA_DIRECT_MSG: 'Halo Mama Cia! Saya mau tanya-tanya dulu 😊', // Pesan tombol WA langsung
};


/* ============================================================
   2. DATA MENU
   Untuk TAMBAH item: salin salah satu objek { name, price, emoji }
   dan tambahkan ke array yang sesuai.
   Untuk HAPUS item: hapus baris objeknya.
   Untuk UBAH harga: ganti angka di `price` (tanpa titik/koma).
   ============================================================ */

// -- Menu Snack --
const snacks = [
  { name: 'Corndog Moza/Sosis',  price: 2000,  emoji: '🌭' },
  { name: 'Kentang Goreng',      price: 5000,  emoji: '🍟' },
  { name: 'Cireng Goreng',       price: 5000,  emoji: '🍘' },
  { name: 'Pisang Goreng',       price: 5000,  emoji: '🍌' },
  { name: 'Pisang Cokelat Keju', price: 5000,  emoji: '🍫' },
  { name: 'Otak Otak Goreng',    price: 5000,  emoji: '🐟' },
  { name: 'Sosis Goreng/Bakar',  price: 2000,  emoji: '🥩' },
  { name: 'Mie Sakura',          price: 4000,  emoji: '🍜' },
  { name: 'Mie Gelas',           price: 3000,  emoji: '🍵' },
  { name: 'Indomie Telur',       price: 10000, emoji: '🍳' },
];

// -- Menu Drink --
const drinks = [
  { name: 'Goodday Cappuccino',  price: 5000,  emoji: '☕' },
  { name: 'Goodday Freeze',      price: 6000,  emoji: '🧊' },
  { name: 'Chocolatos',          price: 5000,  emoji: '🍫' },
  { name: 'Bengbeng',            price: 5000,  emoji: '🍬' },
  { name: 'Milo',                price: 5000,  emoji: '🥛' },
  { name: 'Milo + Susu',         price: 8000,  emoji: '🍶' },
  { name: 'Susu Putih/Coklat',   price: 4000,  emoji: '🥛' },
  { name: 'Nutrisari',           price: 4000,  emoji: '🍊' },
  { name: 'Tea Jus',             price: 2000,  emoji: '🍵' },
  { name: 'Top Ice',             price: 2000,  emoji: '🧃' },
  { name: 'Jasjus',              price: 2000,  emoji: '🫗' },
];


/* ============================================================
   3. STATE KERANJANG
   Object `cart` menyimpan item yang dipilih user.
   Format: { "Nama Produk": { price: 5000, qty: 2 }, ... }
   ============================================================ */
let cart = {};


/* ============================================================
   4. HELPER FUNCTIONS
   ============================================================ */

/**
 * Format angka ke format Rupiah
 * Contoh: 5000 → "Rp 5.000"
 */
function formatRupiah(angka) {
  return 'Rp ' + angka.toLocaleString('id-ID');
}

/**
 * Buat URL WhatsApp dengan pesan yang sudah di-encode
 * @param {string} pesanHeader - Kalimat pembuka pesan
 * @returns {string} URL wa.me lengkap
 */
function buatUrlWA(pesanHeader) {
  let pesan = pesanHeader + '\n\n';
  let total = 0;

  // Loop semua item di keranjang
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
   5. RENDER KARTU MENU
   Fungsi ini membuat kartu HTML untuk setiap item menu
   dan menyisipkannya ke dalam grid yang sesuai
   ============================================================ */

/**
 * Render semua item dari array ke dalam elemen grid
 * @param {Array}  items   - Array data menu (snacks / drinks)
 * @param {string} gridId  - ID elemen grid target di HTML
 */
function renderGrid(items, gridId) {
  const grid = document.getElementById(gridId);

  items.forEach((item, index) => {
    // Buat elemen kartu
    const card = document.createElement('div');
    card.className = 'card';

    // Isi HTML kartu
    // ID tombol unik: "btn-snack-grid-0", "btn-drink-grid-3", dst
    card.innerHTML = `
      <div class="card-emoji">${item.emoji}</div>
      <div class="card-name">${item.name}</div>
      <div class="card-price">${formatRupiah(item.price)}</div>
      <button
        class="card-add"
        id="btn-${gridId}-${index}"
        onclick="tambahKeKeranjang('${item.name}', ${item.price}, '${gridId}', ${index})"
      >+ Tambah</button>
    `;

    grid.appendChild(card);
  });
}


/* ============================================================
   6. LOGIKA KERANJANG
   ============================================================ */

/**
 * Tambah item ke keranjang saat tombol diklik
 * Kalau item sudah ada, qty-nya ditambah 1
 */
function tambahKeKeranjang(namaItem, harga, gridId, index) {
  // Tambah ke object cart
  if (cart[namaItem]) {
    cart[namaItem].qty += 1;
  } else {
    cart[namaItem] = { price: harga, qty: 1 };
  }

  // Update tampilan tombol
  const tombol = document.getElementById(`btn-${gridId}-${index}`);
  tombol.textContent = `✓ ${cart[namaItem].qty}x`;
  tombol.classList.add('added'); // ubah warna tombol jadi hijau

  // Refresh cart bar
  updateCartBar();
}

/**
 * Hitung total item & harga, lalu update tampilan cart bar
 * Cart bar akan muncul jika ada item, hilang jika kosong
 */
function updateCartBar() {
  const cartBar = document.getElementById('cart-bar');
  let totalItem = 0;
  let totalHarga = 0;

  for (const namaItem in cart) {
    totalItem  += cart[namaItem].qty;
    totalHarga += cart[namaItem].price * cart[namaItem].qty;
  }

  // Update teks
  document.getElementById('cart-count').textContent = totalItem;
  document.getElementById('cart-total').textContent  = formatRupiah(totalHarga);

  // Tampilkan/sembunyikan cart bar
  cartBar.classList.toggle('visible', totalItem > 0);
}


/* ============================================================
   7. LOGIKA WHATSAPP
   ============================================================ */

/**
 * Dipanggil saat tombol "Order WA" di cart bar diklik
 * Membuka WA dengan pesan berisi daftar pesanan
 */
function orderViaWA() {
  const url = buatUrlWA(CONFIG.WA_GREETING);
  window.open(url, '_blank');
}

/**
 * Set URL untuk tombol WA langsung (footer & floating button)
 * Pesan kosong / sapaan saja, tidak ada daftar item
 */
function setupTombolWALangsung() {
  const pesanEncoded = encodeURIComponent(CONFIG.WA_DIRECT_MSG);
  const url = `https://wa.me/${CONFIG.WA_NUMBER}?text=${pesanEncoded}`;

  document.getElementById('wa-direct').href = url; // tombol footer
  document.getElementById('wa-float').href  = url; // floating button
}


/* ============================================================
   8. INIT — Jalankan saat halaman pertama kali load
   ============================================================ */
function init() {
  renderGrid(snacks, 'snack-grid'); // render kartu snack
  renderGrid(drinks, 'drink-grid'); // render kartu drink
  setupTombolWALangsung();           // pasang URL ke tombol WA
}

// Jalankan init setelah DOM siap
document.addEventListener('DOMContentLoaded', init);
