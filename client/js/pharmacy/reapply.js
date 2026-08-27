import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

function initFileField(inputId, labelSelector, textSelector) {
  const input = document.querySelector(`#${inputId}`);
  const label = document.querySelector(labelSelector);
  const textSpan = document.querySelector(textSelector);

  input.addEventListener('change', () => {
    if (!input.files.length) return;
    textSpan.textContent = input.files[0].name;
    label.setAttribute('data-filled', 'true');
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
        statusText.textContent = `Location captured (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`;
        button.disabled = false;
        button.textContent = 'Re-detect location';
      },
      () => {
        statusText.textContent = 'Could not get your location. Please allow location access and try again.';
        button.disabled = false;
        button.textContent = 'Detect my location';
      }
    );
  });
}

async function prefillForm() {
  const result = await authFetch('/api/pharmacy/profile');
  if (!result.ok || !result.data) return;

  const form = document.querySelector('[data-reapply-form]');
  const profile = result.data;

  form.pharmacyName.value = profile.pharmacyName || '';
  form.city.value = profile.city || '';
}

function initForm() {
  const form = document.querySelector('[data-reapply-form]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.lat.value || !form.lng.value) {
      return showToast('Please detect your location before submitting');
    }

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const formData = new FormData(form);

    const result = await authFetch('/api/pharmacy/resubmit', {
      method: 'PUT',
      body: formData
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Resubmit application';

    if (!result.ok) {
      showToast(result.message);
      return;
    }

    showToast('Application resubmitted — you will be notified once reviewed', 'success');
    window.location.href = 'dashboard.html';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'pharmacy',
    onReady: (session) => {
      if (session.verificationStatus !== 'rejected') {
        window.location.href = 'dashboard.html';
        return;
      }

      const banner = document.querySelector('[data-rejection-banner]');
      const reasonText = document.querySelector('[data-rejection-reason-text]');
      if (session.rejectionReason) {
        reasonText.textContent = `Admin's reason: ${session.rejectionReason}`;
      } else {
        reasonText.textContent = 'Your previous application was not approved.';
      }
      banner.style.display = 'flex';

      initFileField('document', '[data-doc-label]', '[data-doc-text]');
      initLocationDetect();
      initForm();
      prefillForm();
    }
  });
});