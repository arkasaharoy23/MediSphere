import { verifyPasswordResetCode, confirmPasswordReset } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { auth } from '../config/firebase.js';
import { showToast } from '../components/toast.js';
import { initTheme } from '../utils/theme.js';

function showSection(name) {
  document.querySelectorAll('[data-reset-section]').forEach((el) => {
    el.setAttribute('hidden', '');
  });
  document.querySelector(`[data-reset-section="${name}"]`).removeAttribute('hidden');
}

function friendlyError(err) {
  if (err.code === 'auth/expired-action-code') return 'This link has expired. Request a new one.';
  if (err.code === 'auth/invalid-action-code') return 'This link is invalid or has already been used.';
  if (err.code === 'auth/weak-password') return 'Choose a password with at least 6 characters.';
  return 'This password reset link is no longer valid.';
}

function initResetForm(oobCode) {
  const form = document.querySelector('[data-reset-form]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;

    if (password.length < 6) {
      return showToast('Password must be at least 6 characters');
    }
    if (password !== confirmPassword) {
      return showToast('Passwords do not match');
    }

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Resetting...';

    try {
      await confirmPasswordReset(auth, oobCode, password);
      showSection('success');
    } catch (err) {
      showToast(friendlyError(err));
      submitBtn.disabled = false;
      submitBtn.textContent = 'Reset password';
    }
  });
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const oobCode = params.get('oobCode');

  if (mode !== 'resetPassword' || !oobCode) {
    document.querySelector('[data-reset-error-message]').textContent =
      'This link is missing required information. Please request a new one.';
    showSection('error');
    return;
  }

  showSection('checking');

  try {
    const email = await verifyPasswordResetCode(auth, oobCode);
    document.querySelector('[data-reset-email]').textContent = email;
    showSection('form');
    initResetForm(oobCode);
  } catch (err) {
    document.querySelector('[data-reset-error-message]').textContent = friendlyError(err);
    showSection('error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  init();
});