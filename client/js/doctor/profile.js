import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';
import { SPECIALIZATIONS, DEGREES } from '../utils/medicalOptions.js';

async function populateHospitalOptions(selectedHospitalId) {
  const select = document.querySelector('#hospitalId');
  const result = await authFetch('/api/hospital/directory');
  if (!result.ok) return;

  result.data.forEach((hospital) => {
    const option = document.createElement('option');
    option.value = hospital.id;
    option.textContent = `${hospital.hospitalName} — ${hospital.city}`;
    select.appendChild(option);
  });

  if (selectedHospitalId) {
    select.value = selectedHospitalId;
  }
}

function populateSpecializationOptions() {
  const select = document.querySelector('#specialization');
  SPECIALIZATIONS.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function statusBadgeClass(status) {
  if (status === 'verified') return 'status-badge status-badge--verified';
  if (status === 'rejected') return 'status-badge status-badge--rejected';
  return 'status-badge status-badge--pending';
}

function renderAdditionalDegrees(entries, heldDegrees) {
  const container = document.querySelector('[data-additional-degrees-list]');
  container.innerHTML = '';

  entries.forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'degree-entry';

    const reasonHtml =
      entry.status === 'rejected' && entry.rejectionReason
        ? `<span class="degree-entry__reason">Reason: ${entry.rejectionReason}</span>`
        : '';

    row.innerHTML = `
      <div>
        <span class="degree-entry__name">${entry.degree}</span>
        ${reasonHtml}
      </div>
      <span class="${statusBadgeClass(entry.status)}">${entry.status}</span>
    `;
    container.appendChild(row);
  });

  const select = document.querySelector('#newDegree');
  select.innerHTML = '<option value="" disabled selected>Select degree</option>';
  const unavailable = new Set([
    ...heldDegrees,
    ...entries.filter((e) => e.status !== 'rejected').map((e) => e.degree)
  ]);
  DEGREES.filter((d) => !unavailable.has(d)).forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function populateForm(profile) {
  if (!profile) return;

  const form = document.querySelector('[data-profile-form]');
  form.fullName.value = profile.fullName || '';
  form.specialization.value = profile.specialization || '';
  form.city.value = profile.city || '';

  populateHospitalOptions(profile.hospitalId);

  const degreeEl = document.querySelector('[data-degree]');
  if (degreeEl) {
    degreeEl.textContent = Array.isArray(profile.degree) && profile.degree.length
      ? profile.degree.join(', ')
      : '—';
  }

  const degreeCertLinkEl = document.querySelector('[data-degree-certificate-link]');
  if (degreeCertLinkEl && profile.degreeCertificateViewUrl) {
    degreeCertLinkEl.href = profile.degreeCertificateViewUrl;
  }

  const registrationNumberEl = document.querySelector('[data-registration-number]');
  if (registrationNumberEl) registrationNumberEl.textContent = profile.registrationNumber || '—';

  const certificateLinkEl = document.querySelector('[data-certificate-link]');
  if (certificateLinkEl && profile.registrationCertificateViewUrl) {
    certificateLinkEl.href = profile.registrationCertificateViewUrl;
  }

  renderAdditionalDegrees(profile.additionalDegrees || [], profile.degree || []);
}

async function loadProfile() {
  const result = await authFetch('/api/doctor/profile');
  if (result.ok) {
    populateForm(result.data);
  }
  return result;
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
      lng: form.lng.value,
      hospitalId: form.hospitalId.value
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

function initAddDegreeForm() {
  const form = document.querySelector('[data-add-degree-form]');
  const fileInput = document.querySelector('#additionalDegreeCertificate');
  const fileLabel = document.querySelector('[data-new-degree-cert-label]');
  const fileText = document.querySelector('[data-new-degree-cert-text]');

  fileInput.addEventListener('change', () => {
    if (!fileInput.files.length) return;

    const file = fileInput.files[0];
    if (file.type !== 'application/pdf') {
      fileInput.value = '';
      fileLabel.removeAttribute('data-filled');
      fileText.textContent = 'Choose a file (PDF only)';
      showToast('Please upload a PDF file');
      return;
    }

    fileText.textContent = file.name;
    fileLabel.setAttribute('data-filled', 'true');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.degree.value) {
      return showToast('Select a degree');
    }
    if (!fileInput.files.length) {
      return showToast('Upload a certificate for this degree');
    }

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const formData = new FormData(form);
    const result = await authFetch('/api/doctor/degrees', {
      method: 'POST',
      body: formData
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit for review';

    if (!result.ok) {
      showToast(result.message);
      return;
    }

    showToast('Degree submitted for admin review', 'success');
    form.reset();
    fileLabel.removeAttribute('data-filled');
    fileText.textContent = 'Choose a file (PDF only)';
    loadProfile();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'doctor',
    onReady: () => {
      populateSpecializationOptions();
      initForm();
      initLocationDetect();
      initAddDegreeForm();
      loadProfile();
    }
  });
});