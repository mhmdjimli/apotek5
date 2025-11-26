// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Konfigurasi Firebase Anda
// GANTI dengan konfigurasi dari Firebase Console Anda
const firebaseConfig = {
  apiKey: "AIzaSyCFjmt24vDz1ClA9gEUe3MU8WAuVn3N6L8",
  authDomain: "apotek-e8fd1.firebaseapp.com",
  projectId: "apotek-e8fd1",
  storageBucket: "apotek-e8fd1.firebasestorage.app",
  messagingSenderId: "610480120952",
  appId: "1:610480120952:web:608b68ad875a9fe379398d",
  measurementId: "G-8S80HWCQKR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);
const auth = getAuth(app);

// Export untuk digunakan di file lain
export { db, auth };