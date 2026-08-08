import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';
import { isFileSelected } from '../utils/validators.js';
import { SPECIALIZATIONS, DEGREES } from '../utils/medicalOptions.js';

function populateSelect(selectEl, options) {
  options.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    selectEl.appendChild(option);
  });
}

function populateDegreeCheckboxes(container, options) {
  options.forEach((value, index) => {
    const optionId = `degree-${index}`;

    const optionLabel = document.createElement('label');
    optionLabel.className = 'checkbox-option';
    optionLabel.setAttribute('for', optionId);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = optionId;
    checkbox.name = 'degree';
    checkbox.value = value;

    const optionText = document.createElement('span');
    optionText.textContent = value;

    optionLabel.appendChild(checkbox);
    optionLabel.appendChild(optionText);
    container.appendChild(optionLabel);
  });
}

function initFileField(inputId, labelSelector, textSelector, mimeType, formatLabel) {
  const input = document.querySelector(`#${inputId}`);
  const label = document.querySelector(labelSelector);
  const textSpan = document.querySelector(textSelector);

  input.addEventListener('change', () => {
    if (!isFileSelected(input)) return;

    const file = input.files[0];
    if (file.type !== mimeType) {
      input.value = '';
      label.removeAttribute('data-filled');
      textSpan.textContent = `Choose a file (${formatLabel})`;
      showToast(`Please upload a ${formatLabel} file`);
      return;
    }

    textSpan.textContent = file.name;
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
  const result = await authFetch('/api/doctor/profile');
  if (!result.ok || !result.data) return;

  const form = document.querySelector('[data-reapply-form]');
  const profile = result.data;

  form.fullName.value = profile.fullName || '';
  form.specialization.value = profile.specialization || '';
  form.city.value = profile.city || '';
  form.registrationNumber.value = profile.registrationNumber || '';

  const heldDegrees = new Set(profile.degree || []);
  document.querySelectorAll('[data-degree-checkboxes] input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = heldDegrees.has(checkbox.value);
  });
}

function initForm() {
  const form = document.querySelector('[data-reapply-form]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.querySelector('[data-degree-checkboxes] input:checked')) {
      return showToast('Select at least one medical degree');
    }
    if (!form.lat.value || !form.lng.value) {
      return showToast('Please detect your location before submitting');
    }

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const formData = new FormData(form);

    const result = await authFetch('/api/doctor/resubmit', {
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
    expectedRole: 'doctor',
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

      populateSelect(document.querySelector('#specialization'), SPECIALIZATIONS);
      populateDegreeCheckboxes(document.querySelector('[data-degree-checkboxes]'), DEGREES);
      initFileField('degreeCertificate', '[data-degree-cert-label]', '[data-degree-cert-text]', 'application/pdf', 'PDF only');
      initFileField('registrationCertificate', '[data-registration-cert-label]', '[data-registration-cert-text]', 'image/jpeg', 'JPG only');
      initLocationDetect();
      initForm();
      prefillForm();
    }
  });
});