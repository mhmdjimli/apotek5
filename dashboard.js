import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initObatPage } from '../obat.js';
import { initTransaksiPage } from '../transaksi.js';
import { initLaporanPage } from '../laporan.js';

// Proteksi halaman - cek apakah user sudah login
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Jika belum login, redirect ke halaman login
        window.location.href = 'index.html';
    } else {
        // Tampilkan nama user
        document.getElementById('userName').textContent = user.email.split('@')[0];
        // Load data dashboard
        loadDashboardData();
    }
});

// Fungsi untuk load data dashboard
async function loadDashboardData() {
    try {
        const obatCollection = collection(db, 'obat');
        const obatSnapshot = await getDocs(obatCollection);
        
        let total = 0;
        let stokAman = 0;
        let stokMenipis = 0;
        let stokHabis = 0;
        
        obatSnapshot.forEach((doc) => {
            const data = doc.data();
            total++;
            
            if (data.stok === 0) {
                stokHabis++;
            } else if (data.stok <= 10) {
                stokMenipis++;
            } else {
                stokAman++;
            }
        });
        
        // Update tampilan
        document.getElementById('totalObat').textContent = total;
        document.getElementById('stokAman').textContent = stokAman;
        document.getElementById('stokMenipis').textContent = stokMenipis;
        document.getElementById('stokHabis').textContent = stokHabis;
        
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Logout function
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error logout:', error);
        alert('Gagal logout!');
    }
});

// Menu navigation
const menuItems = document.querySelectorAll('.menu-item');
const pages = document.querySelectorAll('.page');

menuItems.forEach(item => {
    item.addEventListener('click', () => {
        // Remove active class dari semua menu
        menuItems.forEach(m => m.classList.remove('active'));
        // Add active class ke menu yang diklik
        item.classList.add('active');
        
        // Hide semua page
        pages.forEach(p => p.classList.remove('active'));
        
        // Show page yang dipilih
        const pageName = item.getAttribute('data-page');
        document.getElementById(pageName + 'Page').classList.add('active');
        
        // Load data sesuai halaman
        if (pageName === 'obat') {
            initObatPage();
        } else if (pageName === 'transaksi') {
            initTransaksiPage();
        } else if (pageName === 'laporan') {
            initLaporanPage();
        }
    });
});

// Fungsi untuk pindah halaman (dipanggil dari button quick action)
window.goToPage = function(pageName) {
    // Remove active dari semua menu
    menuItems.forEach(m => m.classList.remove('active'));
    
    // Add active ke menu yang sesuai
    const targetMenu = document.querySelector(`[data-page="${pageName}"]`);
    if (targetMenu) {
        targetMenu.classList.add('active');
    }
    
    // Hide semua page
    pages.forEach(p => p.classList.remove('active'));
    
    // Show page target
    document.getElementById(pageName + 'Page').classList.add('active');
    
    // Load data sesuai halaman
    if (pageName === 'obat') {
        initObatPage();
    } else if (pageName === 'transaksi') {
        initTransaksiPage();
    } else if (pageName === 'laporan') {
        initLaporanPage();
    }
}