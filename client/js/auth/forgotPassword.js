import { sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { auth } from '../config/firebase.js';
import { isValidEmail } from '../utils/validators.js';
import { showToast } from '../components/toast.js';
import { initTheme } from '../utils/theme.js';

function showSentState(email) {
  document.querySelector('[data-forgot-form]').setAttribute('hidden', '');
  const status = document.querySelector('[data-forgot-status]');
  status.querySelector('[data-forgot-email]').textContent = email;
  status.removeAttribute('hidden');
}

function friendlyError(err) {
  if (err.code === 'auth/invalid-email') return 'Enter a valid email address';
  if (err.code === 'auth/too-many-requests') return 'Too many attempts, please try again later';
  return err.message.replace('Firebase: ', '');
}

function initForgotForm() {
  const form = document.querySelector('[data-forgot-form]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = form.email.value;
    if (!isValidEmail(email)) return showToast('Enter a valid email address');

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      await sendPasswordResetEmail(auth, email);
      showSentState(email);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        showSentState(email);
        return;
      }
      showToast(friendlyError(err));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send reset link';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initForgotForm();
});