// Import Firebase auth dan config
import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Cek apakah user sudah login
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Jika sudah login, redirect ke dashboard
        window.location.href = 'dashboard.html';
    }
});

// Ambil elemen form
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const errorMessage = document.getElementById('errorMessage');

// Fungsi untuk menampilkan pesan error
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    
    // Hilangkan pesan error setelah 5 detik
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}

// Fungsi untuk menyembunyikan pesan error
function hideError() {
    errorMessage.classList.remove('show');
}

// Handle form submit
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // Validasi input
    if (!email || !password) {
        showError('Email dan password harus diisi!');
        return;
    }
    
    // Disable button saat proses login
    loginBtn.disabled = true;
    loginBtn.textContent = 'Memproses...';
    
    try {
        // Login dengan Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Login berhasil
        console.log('Login berhasil:', userCredential.user);
        
        // Redirect ke dashboard
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        // Login gagal
        console.error('Error login:', error);
        
        let errorMsg = 'Login gagal! ';
        
        switch (error.code) {
            case 'auth/invalid-email':
                errorMsg += 'Format email tidak valid.';
                break;
            case 'auth/user-not-found':
                errorMsg += 'Email tidak terdaftar.';
                break;
            case 'auth/wrong-password':
                errorMsg += 'Password salah.';
                break;
            case 'auth/invalid-credential':
                errorMsg += 'Email atau password salah.';
                break;
            case 'auth/too-many-requests':
                errorMsg += 'Terlalu banyak percobaan. Coba lagi nanti.';
                break;
            default:
                errorMsg += error.message;
        }
        
        showError(errorMsg);
        
        // Enable button kembali
        loginBtn.disabled = false;
        loginBtn.textContent = 'Masuk';
    }
});