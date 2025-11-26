// Import Firebase
import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Variabel global
let allObat = [];
let cart = [];
let selectedObat = null;
let currentUser = null;

// Cek authentication
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Jika belum login, redirect ke halaman login
        window.location.href = 'index.html';
    } else {
        currentUser = user;
        document.getElementById('userName').textContent = user.email.split('@')[0];
        
        // Load data pertama kali
        loadDashboardData();
        loadObatData();
    }
});

// ==================== LOGOUT ====================
document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (confirm('Yakin ingin keluar?')) {
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error logout:', error);
            alert('Gagal logout: ' + error.message);
        }
    }
});

// ==================== NAVIGATION ====================
const menuItems = document.querySelectorAll('.menu-item');
const pages = document.querySelectorAll('.page');

menuItems.forEach(item => {
    item.addEventListener('click', () => {
        const pageName = item.getAttribute('data-page');
        
        // Update active menu
        menuItems.forEach(m => m.classList.remove('active'));
        item.classList.add('active');
        
        // Show selected page
        pages.forEach(p => p.classList.remove('active'));
        document.getElementById(pageName + 'Page').classList.add('active');
        
        // Load data sesuai halaman
        if (pageName === 'obat') {
            loadObatData();
        } else if (pageName === 'transaksi') {
            generateNoTransaksi();
            loadObatForTransaksi();
        } else if (pageName === 'laporan') {
            loadLaporanStok();
        }
    });
});

// Fungsi untuk navigasi dari quick actions
window.goToPage = function(pageName) {
    const menuItem = document.querySelector(`.menu-item[data-page="${pageName}"]`);
    if (menuItem) {
        menuItem.click();
    }
};

// ==================== DASHBOARD DATA ====================
async function loadDashboardData() {
    try {
        const obatSnapshot = await getDocs(collection(db, 'obat'));
        const obatList = obatSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const totalObat = obatList.length;
        const stokAman = obatList.filter(o => o.stok > 10).length;
        const stokMenipis = obatList.filter(o => o.stok > 0 && o.stok <= 10).length;
        const stokHabis = obatList.filter(o => o.stok === 0).length;
        
        document.getElementById('totalObat').textContent = totalObat;
        document.getElementById('stokAman').textContent = stokAman;
        document.getElementById('stokMenipis').textContent = stokMenipis;
        document.getElementById('stokHabis').textContent = stokHabis;
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// ==================== DATA OBAT ====================
async function loadObatData() {
    try {
        const obatSnapshot = await getDocs(collection(db, 'obat'));
        allObat = obatSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        displayObatTable(allObat);
    } catch (error) {
        console.error('Error loading obat:', error);
        document.getElementById('obatTableBody').innerHTML = 
            '<tr><td colspan="7" style="text-align: center; color: red;">Gagal memuat data</td></tr>';
    }
}

function displayObatTable(obatList) {
    const tbody = document.getElementById('obatTableBody');
    
    if (obatList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Belum ada data obat</td></tr>';
        return;
    }
    
    tbody.innerHTML = obatList.map(obat => `
        <tr>
            <td>${obat.kodeObat}</td>
            <td>${obat.namaObat}</td>
            <td>${obat.kategori}</td>
            <td>${obat.stok} ${obat.satuan}</td>
            <td>Rp ${formatRupiah(obat.hargaJual)}</td>
            <td>${obat.tglExpired || '-'}</td>
            <td>
                <button class="btn-edit" onclick="editObat('${obat.id}')">✏️</button>
                <button class="btn-delete" onclick="deleteObat('${obat.id}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// Search obat
document.getElementById('searchObat').addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = allObat.filter(obat => 
        obat.namaObat.toLowerCase().includes(keyword) ||
        obat.kodeObat.toLowerCase().includes(keyword)
    );
    displayObatTable(filtered);
});

// ==================== FORM OBAT ====================
window.showAddForm = function() {
    document.getElementById('formObat').style.display = 'block';
    document.getElementById('formTitle').textContent = 'Tambah Obat Baru';
    document.getElementById('obatForm').reset();
    document.getElementById('obatId').value = '';
};

window.hideForm = function() {
    document.getElementById('formObat').style.display = 'none';
    document.getElementById('obatForm').reset();
};

window.editObat = async function(id) {
    const obat = allObat.find(o => o.id === id);
    if (!obat) return;
    
    document.getElementById('formObat').style.display = 'block';
    document.getElementById('formTitle').textContent = 'Edit Obat';
    document.getElementById('obatId').value = id;
    document.getElementById('kodeObat').value = obat.kodeObat;
    document.getElementById('namaObat').value = obat.namaObat;
    document.getElementById('kategori').value = obat.kategori;
    document.getElementById('satuan').value = obat.satuan;
    document.getElementById('hargaBeli').value = obat.hargaBeli;
    document.getElementById('hargaJual').value = obat.hargaJual;
    document.getElementById('stok').value = obat.stok;
    document.getElementById('tglExpired').value = obat.tglExpired || '';
    document.getElementById('keterangan').value = obat.keterangan || '';
};

window.deleteObat = async function(id) {
    if (!confirm('Yakin ingin menghapus obat ini?')) return;
    
    try {
        await deleteDoc(doc(db, 'obat', id));
        alert('Obat berhasil dihapus!');
        loadObatData();
        loadDashboardData();
    } catch (error) {
        console.error('Error deleting:', error);
        alert('Gagal menghapus obat: ' + error.message);
    }
};

// Submit form obat
document.getElementById('obatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const obatData = {
        kodeObat: document.getElementById('kodeObat').value,
        namaObat: document.getElementById('namaObat').value,
        kategori: document.getElementById('kategori').value,
        satuan: document.getElementById('satuan').value,
        hargaBeli: parseInt(document.getElementById('hargaBeli').value),
        hargaJual: parseInt(document.getElementById('hargaJual').value),
        stok: parseInt(document.getElementById('stok').value),
        tglExpired: document.getElementById('tglExpired').value,
        keterangan: document.getElementById('keterangan').value
    };
    
    const obatId = document.getElementById('obatId').value;
    
    try {
        if (obatId) {
            // Update
            await updateDoc(doc(db, 'obat', obatId), obatData);
            alert('Obat berhasil diupdate!');
        } else {
            // Add new
            await addDoc(collection(db, 'obat'), obatData);
            alert('Obat berhasil ditambahkan!');
        }
        
        hideForm();
        loadObatData();
        loadDashboardData();
    } catch (error) {
        console.error('Error saving:', error);
        alert('Gagal menyimpan obat: ' + error.message);
    }
});

// ==================== TRANSAKSI ====================
function generateNoTransaksi() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    
    document.getElementById('noTransaksi').value = `TRX${year}${month}${date}${time}`;
}

async function loadObatForTransaksi() {
    const obatSnapshot = await getDocs(collection(db, 'obat'));
    allObat = obatSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Autocomplete obat
document.getElementById('searchObatTransaksi').addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase();
    const suggestions = document.getElementById('obatSuggestions');
    
    if (keyword.length < 2) {
        suggestions.innerHTML = '';
        return;
    }
    
    const filtered = allObat.filter(obat => 
        obat.namaObat.toLowerCase().includes(keyword) && obat.stok > 0
    );
    
    suggestions.innerHTML = filtered.map(obat => `
        <div class="suggestion-item" onclick="selectObat('${obat.id}')">
            <strong>${obat.namaObat}</strong> - Stok: ${obat.stok} ${obat.satuan} - Rp ${formatRupiah(obat.hargaJual)}
        </div>
    `).join('');
});

window.selectObat = function(id) {
    selectedObat = allObat.find(o => o.id === id);
    document.getElementById('searchObatTransaksi').value = selectedObat.namaObat;
    document.getElementById('obatSuggestions').innerHTML = '';
    document.getElementById('jumlahObat').focus();
};

window.addToCart = function() {
    if (!selectedObat) {
        alert('Pilih obat terlebih dahulu!');
        return;
    }
    
    const jumlah = parseInt(document.getElementById('jumlahObat').value);
    
    if (jumlah <= 0) {
        alert('Jumlah harus lebih dari 0!');
        return;
    }
    
    if (jumlah > selectedObat.stok) {
        alert('Stok tidak cukup!');
        return;
    }
    
    // Cek apakah obat sudah ada di cart
    const existingItem = cart.find(item => item.id === selectedObat.id);
    
    if (existingItem) {
        existingItem.jumlah += jumlah;
        existingItem.subtotal = existingItem.jumlah * existingItem.hargaJual;
    } else {
        cart.push({
            id: selectedObat.id,
            namaObat: selectedObat.namaObat,
            hargaJual: selectedObat.hargaJual,
            jumlah: jumlah,
            subtotal: selectedObat.hargaJual * jumlah
        });
    }
    
    displayCart();
    
    // Reset form
    document.getElementById('searchObatTransaksi').value = '';
    document.getElementById('jumlahObat').value = '1';
    selectedObat = null;
};

function displayCart() {
    const cartItems = document.getElementById('cartItems');
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: #999;">Keranjang masih kosong</p>';
        document.getElementById('totalBelanja').textContent = 'Rp 0';
        return;
    }
    
    cartItems.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div>
                <strong>${item.namaObat}</strong>
                <p>Rp ${formatRupiah(item.hargaJual)} x ${item.jumlah}</p>
            </div>
            <div>
                <strong>Rp ${formatRupiah(item.subtotal)}</strong>
                <button class="btn-delete" onclick="removeFromCart(${index})">🗑️</button>
            </div>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
    document.getElementById('totalBelanja').textContent = 'Rp ' + formatRupiah(total);
}

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    displayCart();
};

// Hitung kembalian
document.getElementById('bayar').addEventListener('input', (e) => {
    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const bayar = parseInt(e.target.value) || 0;
    const kembalian = bayar - total;
    
    document.getElementById('kembalian').textContent = 'Rp ' + formatRupiah(Math.max(0, kembalian));
});

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
    
    try {
        // Simpan transaksi
        const transaksiData = {
            noTransaksi: document.getElementById('noTransaksi').value,
            tanggal: Timestamp.now(),
            items: cart,
            total: total,
            bayar: bayar,
            kembalian: bayar - total,
            petugas: currentUser.email
        };
        
        await addDoc(collection(db, 'transaksi'), transaksiData);
        
        // Update stok obat
        for (const item of cart) {
            const obatRef = doc(db, 'obat', item.id);
            const obat = allObat.find(o => o.id === item.id);
            await updateDoc(obatRef, {
                stok: obat.stok - item.jumlah
            });
        }
        
        alert('Transaksi berhasil!');
        
        // Reset
        cart = [];
        displayCart();
        document.getElementById('bayar').value = '';
        document.getElementById('kembalian').textContent = 'Rp 0';
        generateNoTransaksi();
        loadObatForTransaksi();
        
    } catch (error) {
        console.error('Error transaksi:', error);
        alert('Gagal memproses transaksi: ' + error.message);
    }
};

// ==================== LAPORAN ====================
window.showLaporan = function(type) {
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Show selected laporan
    document.querySelectorAll('.laporan-content').forEach(content => content.classList.remove('active'));
    
    if (type === 'stok') {
        document.getElementById('laporanStok').classList.add('active');
        loadLaporanStok();
    } else if (type === 'menipis') {
        document.getElementById('laporanMenipis').classList.add('active');
        loadLaporanMenipis();
    } else if (type === 'penjualan') {
        document.getElementById('laporanPenjualan').classList.add('active');
        loadLaporanPenjualan();
    }
};

async function loadLaporanStok() {
    try {
        const obatSnapshot = await getDocs(collection(db, 'obat'));
        const obatList = obatSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const tbody = document.getElementById('stokTableBody');
        tbody.innerHTML = obatList.map((obat, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${obat.kodeObat}</td>
                <td>${obat.namaObat}</td>
                <td>${obat.kategori}</td>
                <td>${obat.stok}</td>
                <td>Rp ${formatRupiah(obat.hargaJual)}</td>
                <td>Rp ${formatRupiah(obat.stok * obat.hargaJual)}</td>
            </tr>
        `).join('');
        
        const totalNilai = obatList.reduce((sum, obat) => sum + (obat.stok * obat.hargaJual), 0);
        document.getElementById('totalItemStok').textContent = obatList.length;
        document.getElementById('totalNilaiStok').textContent = 'Rp ' + formatRupiah(totalNilai);
    } catch (error) {
        console.error('Error loading laporan stok:', error);
    }
}

async function loadLaporanMenipis() {
    try {
        const obatSnapshot = await getDocs(collection(db, 'obat'));
        const obatList = obatSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const menipis = obatList.filter(o => o.stok <= 10);
        
        const tbody = document.getElementById('menipisTableBody');
        
        if (menipis.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Tidak ada stok yang menipis</td></tr>';
            return;
        }
        
        tbody.innerHTML = menipis.map((obat, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${obat.kodeObat}</td>
                <td>${obat.namaObat}</td>
                <td>${obat.kategori}</td>
                <td>${obat.stok}</td>
                <td><span class="badge ${obat.stok === 0 ? 'red' : 'orange'}">${obat.stok === 0 ? 'Habis' : 'Menipis'}</span></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading laporan menipis:', error);
    }
}

async function loadLaporanPenjualan() {
    try {
        const transaksiSnapshot = await getDocs(collection(db, 'transaksi'));
        const transaksiList = transaksiSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        displayLaporanPenjualan(transaksiList);
    } catch (error) {
        console.error('Error loading laporan penjualan:', error);
    }
}

function displayLaporanPenjualan(transaksiList) {
    const tbody = document.getElementById('penjualanTableBody');
    
    if (transaksiList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Belum ada transaksi</td></tr>';
        document.getElementById('totalTransaksi').textContent = '0';
        document.getElementById('totalPenjualan').textContent = 'Rp 0';
        return;
    }
    
    tbody.innerHTML = transaksiList.map((trx, index) => {
        const tanggal = trx.tanggal.toDate();
        return `
            <tr>
                <td>${index + 1}</td>
                <td>${trx.noTransaksi}</td>
                <td>${tanggal.toLocaleDateString('id-ID')}</td>
                <td>Rp ${formatRupiah(trx.total)}</td>
                <td>Rp ${formatRupiah(trx.bayar)}</td>
                <td>Rp ${formatRupiah(trx.kembalian)}</td>
                <td>${trx.petugas}</td>
            </tr>
        `;
    }).join('');
    
    const totalPenjualan = transaksiList.reduce((sum, trx) => sum + trx.total, 0);
    document.getElementById('totalTransaksi').textContent = transaksiList.length;
    document.getElementById('totalPenjualan').textContent = 'Rp ' + formatRupiah(totalPenjualan);
}

window.filterPenjualan = async function() {
    const mulai = document.getElementById('tanggalMulai').value;
    const akhir = document.getElementById('tanggalAkhir').value;
    
    if (!mulai || !akhir) {
        alert('Pilih tanggal mulai dan akhir!');
        return;
    }
    
    try {
        const transaksiSnapshot = await getDocs(collection(db, 'transaksi'));
        const transaksiList = transaksiSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const filtered = transaksiList.filter(trx => {
            const tanggal = trx.tanggal.toDate().toISOString().split('T')[0];
            return tanggal >= mulai && tanggal <= akhir;
        });
        
        displayLaporanPenjualan(filtered);
    } catch (error) {
        console.error('Error filter penjualan:', error);
    }
};

window.printLaporan = function(type) {
    window.print();
};

// ==================== HELPER FUNCTIONS ====================
function formatRupiah(angka) {
    return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
