import { signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { auth } from '../config/firebase.js';

function initLogout() {
  document.querySelectorAll('[data-logout-btn]').forEach((button) => {
    button.addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = '../auth/login.html';
    });
  });
}

export { initLogout };