import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

function statusBadgeClass(status) {
  if (status === 'verified') return 'status-badge status-badge--verified';
  if (status === 'rejected') return 'status-badge status-badge--rejected';
  return 'status-badge status-badge--pending';
}

function buildDoctorCard(doctor) {
  const card = document.createElement('div');
  card.className = 'hosp-card';

  card.innerHTML = `
    <div class="hosp-card__info">
      <h3>${doctor.fullName} <span class="${statusBadgeClass(doctor.verificationStatus)}">${doctor.verificationStatus}</span></h3>
      <p>${doctor.specialization} · ${doctor.email}</p>
    </div>
    <button type="button" class="btn btn--ghost btn--sm" data-remove-btn>Remove</button>
  `;

  card.querySelector('[data-remove-btn]').addEventListener('click', async () => {
    if (!window.confirm(`Remove ${doctor.fullName} from your hospital?`)) return;
    const result = await authFetch(`/api/hospital/doctors/${doctor.userId}`, { method: 'DELETE' });
    if (!result.ok) return showToast(result.message);
    showToast('Doctor removed', 'success');
    loadDoctors();
  });

  return card;
}

async function loadDoctors() {
  const list = document.querySelector('[data-doctor-list]');
  const result = await authFetch('/api/hospital/doctors');

  if (!result.ok) {
    list.innerHTML = `<p class="hosp-empty">${result.message}</p>`;
    return;
  }

  if (result.data.length === 0) {
    list.innerHTML = '<p class="hosp-empty">No doctors are affiliated with your hospital yet.</p>';
    return;
  }

  list.innerHTML = '';
  result.data.forEach((doctor) => list.appendChild(buildDoctorCard(doctor)));
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'hospital',
    onReady: () => loadDoctors()
  });
});