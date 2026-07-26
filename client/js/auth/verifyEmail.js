import { applyActionCode, sendEmailVerification, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { auth } from '../config/firebase.js';
import { showToast } from '../components/toast.js';
import { initTheme } from '../utils/theme.js';

let currentUser = null;

function showSection(name) {
  document.querySelectorAll('[data-verify-section]').forEach((el) => {
    el.setAttribute('hidden', '');
  });
  document.querySelector(`[data-verify-section="${name}"]`).removeAttribute('hidden');
}

async function handleActionCode(oobCode) {
  showSection('checking');
  try {
    await applyActionCode(auth, oobCode);
    showSection('success');
  } catch (err) {
    document.querySelector('[data-verify-error-message]').textContent =
      'This link is invalid or has expired. Request a new one below.';
    showSection('error');
  }
}

function wireResendButton(button) {
  let cooldownActive = false;

  button.addEventListener('click', async () => {
    if (cooldownActive) return;

    if (!currentUser) {
      showToast('Please log in first, then request a new verification email');
      return;
    }

    try {
      await sendEmailVerification(currentUser);
      showToast('Verification email sent', 'success');
      cooldownActive = true;
      button.disabled = true;
      let seconds = 30;
      button.textContent = `Resend in ${seconds}s`;
      const interval = setInterval(() => {
        seconds -= 1;
        button.textContent = `Resend in ${seconds}s`;
        if (seconds <= 0) {
          clearInterval(interval);
          cooldownActive = false;
          button.disabled = false;
          button.textContent = 'Resend email';
        }
      }, 1000);
    } catch (err) {
      showToast('Could not send the email, please try again shortly');
    }
  });
}

function initResendButtons() {
  document.querySelectorAll('[data-resend-btn]').forEach(wireResendButton);
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
  });

  initResendButtons();

  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const oobCode = params.get('oobCode');

  if (mode === 'verifyEmail' && oobCode) {
    handleActionCode(oobCode);
  } else {
    showSection('pending');
  }
});