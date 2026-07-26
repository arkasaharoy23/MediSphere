import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { auth } from '../config/firebase.js';
import { getSession } from '../services/apiService.js';
import { initLogout } from '../auth/logout.js';
import { initSidebar } from '../components/sidebar.js';
import { initTheme } from '../utils/theme.js';

function renderAvatar(profilePicUrl, email) {
  const avatarEl = document.querySelector('[data-topbar-avatar]');
  if (!avatarEl) return;

  if (profilePicUrl) {
    avatarEl.innerHTML = `<img src="${profilePicUrl}" alt="Profile picture">`;
  } else {
    avatarEl.textContent = email.charAt(0).toUpperCase();
  }
}

function initAdminPage(onReady) {
  initTheme();
  initSidebar();
  initLogout();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = '../auth/login.html';
      return;
    }

    const session = await getSession();

    if (!session.ok || session.data.role !== 'admin') {
      window.location.href = '../auth/login.html';
      return;
    }

    const nameEl = document.querySelector('[data-user-name]');
    if (nameEl) nameEl.textContent = session.data.email;

    renderAvatar(session.data.profilePicUrl, session.data.email);

    if (onReady) onReady(session.data);
  });
}

export { initAdminPage };