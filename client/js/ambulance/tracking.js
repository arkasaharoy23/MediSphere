import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

let watchId = null;

function setSharingState(isSharing) {
  const dot = document.querySelector('[data-tracking-dot]');
  const label = document.querySelector('[data-tracking-label]');
  const button = document.querySelector('[data-toggle-tracking-btn]');

  if (isSharing) {
    dot.classList.add('tracking-status__dot--live');
    label.textContent = 'Sharing location live';
    button.textContent = 'Stop sharing location';
    button.classList.remove('btn--primary');
    button.classList.add('btn--coral');
  } else {
    dot.classList.remove('tracking-status__dot--live');
    label.textContent = 'Not sharing location';
    button.textContent = 'Start sharing location';
    button.classList.remove('btn--coral');
    button.classList.add('btn--primary');
  }
}

async function pushLocation(lat, lng) {
  const coordsEl = document.querySelector('[data-tracking-coords]');
  coordsEl.textContent = `Last sent: ${lat.toFixed(5)}, ${lng.toFixed(5)} at ${new Date().toLocaleTimeString()}`;

  const result = await authFetch('/api/ambulance/location', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng })
  });

  if (!result.ok) {
    showToast(result.message);
  }
}

function startSharing() {
  if (!navigator.geolocation) {
    showToast('Your browser does not support location sharing');
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      pushLocation(position.coords.latitude, position.coords.longitude);
    },
    () => {
      showToast('Could not get your location — please allow location access');
      stopSharing();
    },
    { enableHighAccuracy: true, maximumAge: 5000 }
  );

  setSharingState(true);
}

function stopSharing() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  setSharingState(false);
}

function initToggle() {
  const button = document.querySelector('[data-toggle-tracking-btn]');

  button.addEventListener('click', () => {
    if (watchId === null) {
      startSharing();
    } else {
      stopSharing();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'ambulance',
    onReady: () => {
      initToggle();
    }
  });
});