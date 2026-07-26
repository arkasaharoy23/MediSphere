import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { auth } from '../config/firebase.js';
import { API_BASE_URL } from '../config/api.js';

function onAuthReady(callback) {
  onAuthStateChanged(auth, callback);
}

async function resolveAndRedirect(user) {
  const idToken = await user.getIdToken();

  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  });

  const result = await response.json();

  if (!result.ok) {
    return result;
  }

  window.location.href = `../${result.data.role}/dashboard.html`;
  return result;
}

export { onAuthReady, resolveAndRedirect };