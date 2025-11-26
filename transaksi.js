import { db, auth } from '../firebase-config.js';
import { collection, addDoc, getDocs, doc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let allObatList = [];
let cart = [];
let selectedObat = null;

// Generate nomor transaksi
function generateNoTransaksi() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TRX${year}${month}${date}${random}`;
}

// Load semua obat untuk autocomplete
async function loadObatList() {
    try {
        const obatCol = collection(db, 'obat');
        const snapshot = await getDocs(obatCol);
        
        allObatList = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.stok > 0) { // Hanya obat yang masih ada stoknya
                allObatList.push({
                    id: doc.id,
                    ...data
                });
            }
        });
    } catch (error) {
        console.error('Error loading obat:', error);
    }
}

// Search obat dengan autocomplete
const searchInput = document.getElementById('searchObatTransaksi');
const suggestionsDiv = document.getElementById('obatSuggestions');

searchInput.addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase().trim();
    
    if (keyword.length < 2) {
        suggestionsDiv.classList.remove('show');
        return;
    }
    
    const filtered = allObatList.filter(obat => 
        obat.namaObat.toLowerCase().includes(keyword) ||
        obat.kodeObat.toLowerCase().includes(keyword)
    );
    
    if (filtered.length > 0) {
        suggestionsDiv.innerHTML = filtered.map(obat => `
            <div class="suggestion-item" onclick="selectObat('${obat.id}')">
                <div class="suggestion-name">${obat.namaObat}</div>
                <div class="suggestion-info">
                    ${obat.kodeObat} | Stok: ${obat.stok} | Rp ${new Intl.NumberFormat('id-ID').format(obat.hargaJual)}
                </div>
            </div>
        `).join('');
        suggestionsDiv.classList.add('show');
    } else {
        suggestionsDiv.classList.remove('show');
    }
});

// Pilih obat dari suggestions
window.selectObat = function(id) {
    selectedObat = allObatList.find(o => o.id === id);
    if (selectedObat) {
        searchInput.value = selectedObat.namaObat;
        suggestionsDiv.classList.remove('show');
        document.getElementById('jumlahObat').focus();
    }
}

// Tambah ke keranjang
window.addToCart = function() {
    if (!selectedObat) {
        alert('Pilih obat terlebih dahulu!');
        return;
    }
    
    const jumlah = parseInt(document.getElementById('jumlahObat').value);
    
    if (jumlah < 1) {
        alert('Jumlah minimal 1!');
        return;
    }
    
    if (jumlah > selectedObat.stok) {
        alert(`Stok tidak cukup! Stok tersedia: ${selectedObat.stok}`);
        return;
    }
    
    // Cek apakah obat sudah ada di keranjang
    const existingItem = cart.find(item => item.id === selectedObat.id);
    
    if (existingItem) {
        const totalJumlah = existingItem.jumlah + jumlah;
        if (totalJumlah > selectedObat.stok) {
            alert(`Stok tidak cukup! Stok tersedia: ${selectedObat.stok}`);
            return;
        }
        existingItem.jumlah = totalJumlah;
        existingItem.subtotal = existingItem.jumlah * existingItem.harga;
    } else {
        cart.push({
            id: selectedObat.id,
            namaObat: selectedObat.namaObat,
            harga: selectedObat.hargaJual,
            jumlah: jumlah,
            subtotal: selectedObat.hargaJual * jumlah,
            stokAwal: selectedObat.stok
        });
    }
    
    // Reset form
    searchInput.value = '';
    document.getElementById('jumlahObat').value = 1;
    selectedObat = null;
    
    updateCartDisplay();
}

// Update tampilan keranjang
function updateCartDisplay() {
    const cartItemsDiv = document.getElementById('cartItems');
    
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p style="text-align: center; color: #999;">Keranjang masih kosong</p>';
        document.getElementById('totalBelanja').textContent = 'Rp 0';
        document.getElementById('kembalian').textContent = 'Rp 0';
        return;
    }
    
    cartItemsDiv.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.namaObat}</div>
                <div class="cart-item-detail">
                    ${item.jumlah} x Rp ${new Intl.NumberFormat('id-ID').format(item.harga)} = 
                    Rp ${new Intl.NumberFormat('id-ID').format(item.subtotal)}
                </div>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart(${index})">✖</button>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
    document.getElementById('totalBelanja').textContent = 'Rp ' + new Intl.NumberFormat('id-ID').format(total);
    
    calculateKembalian();
}

// Hapus item dari keranjang
window.removeFromCart = function(index) {
    cart.splice(index, 1);
    updateCartDisplay();
}

// Hitung kembalian
document.getElementById('bayar').addEventListener('input', calculateKembalian);

function calculateKembalian() {
    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const bayar = parseInt(document.getElementById('bayar').value) || 0;
    const kembalian = bayar - total;
    
    const kembalianEl = document.getElementById('kembalian');
    if (kembalian >= 0) {
        kembalianEl.textContent = 'Rp ' + new Intl.NumberFormat('id-ID').format(kembalian);
        kembalianEl.style.color = '#155724';
    } else {
        kembalianEl.textContent = 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.abs(kembalian));
        kembalianEl.style.color = '#721c24';
    }
}

// Proses transaksi
window.prosesTransaksi = async function() {
    if (cart.length === 0) {
        alert('Keranjang masih kosong!');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const bayar = parseInt(document.getElementById('bayar').value) || 0;
    
    if (bayar < total) {
        alert('Pembayaran kurang!');
        return;
    }
    
    if (!confirm('Proses transaksi ini?')) {
        return;
    }
    
    try {
        const kembalian = bayar - total;
        const noTransaksi = document.getElementById('noTransaksi').value;
        const petugas = auth.currentUser?.email || 'Unknown';
        
        // Simpan transaksi
        const transaksiData = {
            noTransaksi: noTransaksi,
            tanggal: new Date().toISOString(),
            items: cart,
            total: total,
            bayar: bayar,
            kembalian: kembalian,
            petugas: petugas,
            createdAt: new Date().toISOString()
        };
        
        await addDoc(collection(db, 'transaksi'), transaksiData);
        
        // Update stok obat
        for (const item of cart) {
            const obatRef = doc(db, 'obat', item.id);
            const newStok = item.stokAwal - item.jumlah;
            await updateDoc(obatRef, { stok: newStok });
        }
        
        alert('Transaksi berhasil!\n\nTotal: Rp ' + new Intl.NumberFormat('id-ID').format(total) + 
              '\nBayar: Rp ' + new Intl.NumberFormat('id-ID').format(bayar) + 
              '\nKembalian: Rp ' + new Intl.NumberFormat('id-ID').format(kembalian));
        
        // Reset
        cart = [];
        document.getElementById('bayar').value = '';
        document.getElementById('noTransaksi').value = generateNoTransaksi();
        updateCartDisplay();
        loadObatList();
        
    } catch (error) {
        console.error('Error proses transaksi:', error);
        alert('Gagal memproses transaksi!');
    }
}

// Init transaksi page
export function initTransaksiPage() {
    document.getElementById('noTransaksi').value = generateNoTransaksi();
    cart = [];
    updateCartDisplay();
    loadObatList();
}