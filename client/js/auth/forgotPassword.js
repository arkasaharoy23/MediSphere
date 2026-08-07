import { isValidEmail } from '../utils/validators.js';
import { showToast } from '../components/toast.js';
import { initTheme } from '../utils/theme.js';
import { API_BASE_URL } from '../config/api.js';

function showSentState(email) {
  document.querySelector('[data-forgot-form]').setAttribute('hidden', '');
  const status = document.querySelector('[data-forgot-status]');
  status.querySelector('[data-forgot-email]').textContent = email;
  status.removeAttribute('hidden');
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
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const result = await response.json();

      if (!result.ok) {
        showToast(result.message || 'Something went wrong, please try again');
        return;
      }

      showSentState(email);
    } catch (err) {
      showToast('Could not reach the server, please try again');
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