import { auth } from '../config/firebase.js';
import { API_BASE_URL } from '../config/api.js';

async function authFetch(url, options = {}) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Not signed in');
  }

  const idToken = await user.getIdToken();

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${idToken}`
  };

  const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
  return response.json();
}

async function getSession() {
  return authFetch('/api/auth/session');
}

export { authFetch, getSession };