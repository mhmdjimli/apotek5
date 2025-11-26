import { db } from '../firebase-config.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let allObat = [];

// Fungsi untuk menampilkan form tambah
window.showAddForm = function() {
    document.getElementById('formObat').style.display = 'block';
    document.getElementById('formTitle').textContent = 'Tambah Obat Baru';
    document.getElementById('obatForm').reset();
    document.getElementById('obatId').value = '';
}

// Fungsi untuk menyembunyikan form
window.hideForm = function() {
    document.getElementById('formObat').style.display = 'none';
    document.getElementById('obatForm').reset();
}

// Load semua data obat
export async function loadObat() {
    try {
        const obatCol = collection(db, 'obat');
        const obatQuery = query(obatCol, orderBy('namaObat'));
        const snapshot = await getDocs(obatQuery);
        
        allObat = [];
        snapshot.forEach((doc) => {
            allObat.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayObat(allObat);
    } catch (error) {
        console.error('Error loading obat:', error);
        alert('Gagal memuat data obat!');
    }
}

// Tampilkan data obat ke tabel
function displayObat(data) {
    const tbody = document.getElementById('obatTableBody');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Belum ada data obat</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(obat => {
        // Tentukan badge stok
        let stockBadge = '';
        if (obat.stok === 0) {
            stockBadge = '<span class="badge danger">Habis</span>';
        } else if (obat.stok <= 10) {
            stockBadge = '<span class="badge warning">' + obat.stok + '</span>';
        } else {
            stockBadge = '<span class="badge success">' + obat.stok + '</span>';
        }
        
        // Format harga
        const harga = new Intl.NumberFormat('id-ID').format(obat.hargaJual);
        
        // Format tanggal expired
        const expired = obat.tglExpired || '-';
        
        return `
            <tr>
                <td>${obat.kodeObat}</td>
                <td>${obat.namaObat}</td>
                <td>${obat.kategori}</td>
                <td>${stockBadge}</td>
                <td>Rp ${harga}</td>
                <td>${expired}</td>
                <td>
                    <button class="btn-action btn-edit" onclick="editObat('${obat.id}')">✏️ Edit</button>
                    <button class="btn-action btn-delete" onclick="deleteObat('${obat.id}', '${obat.namaObat}')">🗑️ Hapus</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Submit form (tambah atau edit)
document.getElementById('obatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const obatId = document.getElementById('obatId').value;
    const obatData = {
        kodeObat: document.getElementById('kodeObat').value,
        namaObat: document.getElementById('namaObat').value,
        kategori: document.getElementById('kategori').value,
        satuan: document.getElementById('satuan').value,
        hargaBeli: parseInt(document.getElementById('hargaBeli').value),
        hargaJual: parseInt(document.getElementById('hargaJual').value),
        stok: parseInt(document.getElementById('stok').value),
        tglExpired: document.getElementById('tglExpired').value,
        keterangan: document.getElementById('keterangan').value,
        updatedAt: new Date().toISOString()
    };
    
    try {
        if (obatId) {
            // Update obat
            await updateDoc(doc(db, 'obat', obatId), obatData);
            alert('Data obat berhasil diupdate!');
        } else {
            // Tambah obat baru
            obatData.createdAt = new Date().toISOString();
            await addDoc(collection(db, 'obat'), obatData);
            alert('Obat baru berhasil ditambahkan!');
        }
        
        hideForm();
        loadObat();
    } catch (error) {
        console.error('Error saving obat:', error);
        alert('Gagal menyimpan data obat!');
    }
});

// Edit obat
window.editObat = async function(id) {
    const obat = allObat.find(o => o.id === id);
    if (!obat) return;
    
    document.getElementById('formObat').style.display = 'block';
    document.getElementById('formTitle').textContent = 'Edit Obat';
    document.getElementById('obatId').value = obat.id;
    document.getElementById('kodeObat').value = obat.kodeObat;
    document.getElementById('namaObat').value = obat.namaObat;
    document.getElementById('kategori').value = obat.kategori;
    document.getElementById('satuan').value = obat.satuan;
    document.getElementById('hargaBeli').value = obat.hargaBeli;
    document.getElementById('hargaJual').value = obat.hargaJual;
    document.getElementById('stok').value = obat.stok;
    document.getElementById('tglExpired').value = obat.tglExpired || '';
    document.getElementById('keterangan').value = obat.keterangan || '';
    
    // Scroll ke form
    document.getElementById('formObat').scrollIntoView({ behavior: 'smooth' });
}

// Hapus obat
window.deleteObat = async function(id, nama) {
    if (!confirm(`Apakah Anda yakin ingin menghapus obat "${nama}"?`)) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'obat', id));
        alert('Obat berhasil dihapus!');
        loadObat();
    } catch (error) {
        console.error('Error deleting obat:', error);
        alert('Gagal menghapus obat!');
    }
}

// Search obat
document.getElementById('searchObat').addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = allObat.filter(obat => 
        obat.namaObat.toLowerCase().includes(keyword) ||
        obat.kodeObat.toLowerCase().includes(keyword) ||
        obat.kategori.toLowerCase().includes(keyword)
    );
    displayObat(filtered);
});

// Auto load saat halaman obat dibuka
export function initObatPage() {
    loadObat();
}