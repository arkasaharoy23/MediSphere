import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { auth } from '../config/firebase.js';
import { signInWithGoogle } from './googleAuth.js';
import { resolveAndRedirect } from './authGuard.js';
import { isValidEmail } from '../utils/validators.js';
import { showToast } from '../components/toast.js';
import { showAlertModal } from '../components/modal.js';
import { initTheme } from '../utils/theme.js';
import { initPasswordToggles } from '../components/passwordToggle.js';

const FRIENDLY_ERRORS = {
  'auth/user-not-found': 'No account found with this email',
  'auth/wrong-password': 'Incorrect password',
  'auth/invalid-credential': 'Incorrect email or password',
  'auth/too-many-requests': 'Too many attempts, please try again later'
};

function friendlyError(err) {
  return FRIENDLY_ERRORS[err.code] || err.message.replace('Firebase: ', '');
}

async function handleSession(user) {
  const result = await resolveAndRedirect(user);
  if (!result.ok) {
    showAlertModal(result.message, 'Could not log in');
  }
}

function initLoginForm() {
  const form = document.querySelector('[data-login-form]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = form.email.value;
    const password = form.password.value;

    if (!isValidEmail(email)) return showToast('Enter a valid email address');
    if (!password) return showToast('Enter your password');

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await handleSession(credential.user);
    } catch (err) {
      showAlertModal(friendlyError(err), 'Could not log in');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log in';
    }
  });
}

function initGoogleButton() {
  const googleBtn = document.querySelector('[data-google-btn]');

  googleBtn.addEventListener('click', async () => {
    try {
      const user = await signInWithGoogle();
      await handleSession(user);
    } catch (err) {
      showAlertModal(friendlyError(err), 'Could not log in');
    }
  });
}

function initAdminToggle() {
  const toggleBtn = document.querySelector('[data-admin-toggle-btn]');
  const heading = document.querySelector('[data-login-heading]');
  const subtext = document.querySelector('[data-login-subtext]');
  const hideEls = document.querySelectorAll('[data-hide-in-admin-mode]');
  let adminMode = false;

  toggleBtn.addEventListener('click', () => {
    adminMode = !adminMode;

    heading.textContent = adminMode ? 'Administrator log in' : 'Log in';
    subtext.textContent = adminMode
      ? 'Restricted access for PulseLink administrators.'
      : 'Enter your details to continue.';
    toggleBtn.textContent = adminMode
      ? 'Not an administrator? Back to regular login'
      : 'Are you an administrator? Log in as admin';

    hideEls.forEach((el) => {
      el.style.display = adminMode ? 'none' : '';
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initPasswordToggles();
  initLoginForm();
  initGoogleButton();
  initAdminToggle();
});