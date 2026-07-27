import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

function populateForm(profile) {
  if (!profile) return;

  const form = document.querySelector('[data-profile-form]');
  form.fullName.value = profile.fullName || '';
  form.dateOfBirth.value = profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '';
  form.gender.value = profile.gender || '';
  form.bloodGroup.value = profile.bloodGroup || 'unknown';
  form.address.value = profile.address || '';
  form.emergencyContactName.value = profile.emergencyContactName || '';
  form.emergencyContactPhone.value = profile.emergencyContactPhone || '';
}

async function loadProfile() {
  const result = await authFetch('/api/patient/profile');
  if (result.ok) {
    populateForm(result.data);
  }
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
      dateOfBirth: form.dateOfBirth.value,
      gender: form.gender.value,
      bloodGroup: form.bloodGroup.value,
      address: form.address.value,
      emergencyContactName: form.emergencyContactName.value,
      emergencyContactPhone: form.emergencyContactPhone.value
    };

    const result = await authFetch('/api/patient/profile', {
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
    expectedRole: 'patient',
    onReady: () => {
      initForm();
      loadProfile();
    }
  });
});