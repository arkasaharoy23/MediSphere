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

function renderStatusBanner(verificationStatus) {
  const banner = document.querySelector('[data-status-banner]');
  if (!banner) return;

  const textEl = banner.querySelector('[data-status-text]');

  if (verificationStatus === 'pending') {
    banner.classList.add('dash-banner--pending');
    textEl.textContent = 'Your account is pending admin verification. Some features are unavailable until you are approved.';
  } else if (verificationStatus === 'rejected') {
    banner.classList.add('dash-banner--pending');
    textEl.textContent = 'Your verification was not approved. Please contact support or update your documents.';
  } else {
    textEl.textContent = 'Your account is verified and ready to use.';
  }
}

function initDashboard({ expectedRole, onReady }) {
  initTheme();
  initSidebar();
  initLogout();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = '../auth/login.html';
      return;
    }

    const session = await getSession();

    if (!session.ok) {
      window.location.href = '../auth/login.html';
      return;
    }

    if (expectedRole && session.data.role !== expectedRole) {
      window.location.href = `../${session.data.role}/dashboard.html`;
      return;
    }

    const nameEl = document.querySelector('[data-user-name]');
    if (nameEl) nameEl.textContent = session.data.displayName || session.data.email;

    renderAvatar(session.data.profilePicUrl, session.data.email);
    renderStatusBanner(session.data.verificationStatus);

    if (onReady) onReady(session.data);
  });
}

export { initDashboard };