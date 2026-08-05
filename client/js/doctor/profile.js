import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

function populateForm(profile) {
  if (!profile) return;

  const form = document.querySelector('[data-profile-form]');
  form.fullName.value = profile.fullName || '';
  form.specialization.value = profile.specialization || '';
  form.city.value = profile.city || '';

  const registrationNumberEl = document.querySelector('[data-registration-number]');
  if (registrationNumberEl) registrationNumberEl.textContent = profile.registrationNumber || '—';

  const certificateLinkEl = document.querySelector('[data-certificate-link]');
  if (certificateLinkEl && profile.registrationCertificateViewUrl) {
    certificateLinkEl.href = profile.registrationCertificateViewUrl;
  }
}

async function loadProfile() {
  const result = await authFetch('/api/doctor/profile');
  if (result.ok) {
    populateForm(result.data);
  }
}

function initLocationDetect() {
  const button = document.querySelector('[data-detect-location-btn]');
  const statusText = document.querySelector('[data-location-status]');
  const latInput = document.querySelector('#lat');
  const lngInput = document.querySelector('#lng');

  button.addEventListener('click', () => {
    if (!navigator.geolocation) {
      statusText.textContent = 'Your browser does not support location detection.';
      return;
    }

    button.disabled = true;
    button.textContent = 'Detecting...';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        latInput.value = position.coords.latitude;
        lngInput.value = position.coords.longitude;
        statusText.textContent = `Location captured (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}) — will update when you save.`;
        button.disabled = false;
        button.textContent = 'Re-detect location';
      },
      () => {
        statusText.textContent = 'Could not get your location. Please allow location access and try again.';
        button.disabled = false;
        button.textContent = 'Re-detect location';
      }
    );
  });
}

function initForm() {
  const form = document.querySelector('[data-profile-form]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const payload = {
      fullName: form.fullName.value,
      specialization: form.specialization.value,
      city: form.city.value,
      lat: form.lat.value,
      lng: form.lng.value
    };

    const result = await authFetch('/api/doctor/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Save changes';

    if (!result.ok) {
      showToast(result.message);
      return;
    }

    showToast('Profile updated', 'success');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'doctor',
    onReady: () => {
      initForm();
      initLocationDetect();
      loadProfile();
    }
  });
});