import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyCkOyUyZyG8G2M5uCzFDUCFGYj4psTIaU0",
  authDomain: "pulselink-b8907.firebaseapp.com",
  projectId: "pulselink-b8907",
  storageBucket: "pulselink-b8907.firebasestorage.app",
  messagingSenderId: "1059308869159",
  appId: "1:1059308869159:web:51ef987a1b9d3f9ec8a002",
  measurementId: "G-MPXX3LPYV7"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

export { auth };