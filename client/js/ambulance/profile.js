import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

function populateForm(profile) {
  if (!profile) return;

  const form = document.querySelector('[data-profile-form]');
  form.driverName.value = profile.driverName || '';
  form.city.value = profile.city || '';

  document.querySelector('#available').checked = !!profile.available;

  const vehicleEl = document.querySelector('[data-vehicle-number]');
  if (vehicleEl) vehicleEl.textContent = profile.vehicleNumber || '—';

  const licenseEl = document.querySelector('[data-license-number]');
  if (licenseEl) licenseEl.textContent = profile.driverLicenseNumber || '—';

  const linkMap = {
    '[data-rc-link]': profile.rcDocumentViewUrl,
    '[data-license-doc-link]': profile.driverLicenseDocViewUrl,
    '[data-photo-link]': profile.driverPhotoViewUrl,
    '[data-id-doc-link]': profile.driverIdDocViewUrl,
    '[data-permit-link]': profile.permitDocumentViewUrl
  };

  Object.entries(linkMap).forEach(([selector, url]) => {
    const el = document.querySelector(selector);
    if (el && url) el.href = url;
  });
}

async function loadProfile() {
  const result = await authFetch('/api/ambulance/profile');
  if (result.ok) {
    populateForm(result.data);
  }
}

function initAvailabilityToggle() {
  const checkbox = document.querySelector('#available');

  checkbox.addEventListener('change', async () => {
    const result = await authFetch('/api/ambulance/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        driverName: document.querySelector('#driverName').value,
        city: document.querySelector('#city').value,
        available: checkbox.checked
      })
    });

    if (!result.ok) {
      showToast(result.message);
      checkbox.checked = !checkbox.checked;
      return;
    }

    showToast(checkbox.checked ? 'You are now available' : 'You are now unavailable', 'success');
  });
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
      driverName: form.driverName.value,
      city: form.city.value,
      lat: form.lat.value,
      lng: form.lng.value,
      available: document.querySelector('#available').checked
    };

    const result = await authFetch('/api/ambulance/profile', {
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
    expectedRole: 'ambulance',
    onReady: () => {
      initForm();
      initAvailabilityToggle();
      initLocationDetect();
      loadProfile();
    }
  });
});