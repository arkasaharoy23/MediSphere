import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

function statusBadgeClass(status) {
  return `status-badge status-badge--${status}`;
}

function buildActions(appt) {
  if (appt.status === 'pending') {
    return `
      <button type="button" class="btn btn--primary btn--sm" data-confirm-btn>Confirm</button>
      <button type="button" class="btn btn--ghost btn--sm" data-cancel-btn>Decline</button>
    `;
  }
  if (appt.status === 'confirmed') {
    return `
      <button type="button" class="btn btn--primary btn--sm" data-complete-btn>Mark completed</button>
      <button type="button" class="btn btn--ghost btn--sm" data-cancel-btn>Cancel</button>
    `;
  }
  return '';
}

function buildApptCard(appt) {
  const card = document.createElement('div');
  card.className = 'appt-card';

  const dateLabel = new Date(appt.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  card.innerHTML = `
    <div class="appt-card__info">
      <h3>${appt.patientName}</h3>
      <p>${dateLabel} at ${appt.timeSlot}${appt.reason ? ' · ' + appt.reason : ''}</p>
      <p>${appt.visitLocation === 'hospital' ? `At ${appt.hospitalName || 'the hospital'}` : 'At your clinic'}</p>
    </div>
    <div class="appt-card__meta">
      <span class="${statusBadgeClass(appt.status)}">${appt.status}</span>
      ${buildActions(appt)}
    </div>
  `;

  const confirmBtn = card.querySelector('[data-confirm-btn]');
  const completeBtn = card.querySelector('[data-complete-btn]');
  const cancelBtn = card.querySelector('[data-cancel-btn]');

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      const result = await authFetch(`/api/appointments/${appt.id}/confirm`, { method: 'PATCH' });
      if (!result.ok) return showToast(result.message);
      showToast('Appointment confirmed', 'success');
      loadAppointments();
    });
  }

  if (completeBtn) {
    completeBtn.addEventListener('click', async () => {
      const result = await authFetch(`/api/appointments/${appt.id}/complete`, { method: 'PATCH' });
      if (!result.ok) return showToast(result.message);
      showToast('Appointment marked completed', 'success');
      loadAppointments();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', async () => {
      if (!window.confirm('Are you sure?')) return;
      const result = await authFetch(`/api/appointments/${appt.id}/cancel`, { method: 'PATCH' });
      if (!result.ok) return showToast(result.message);
      showToast('Appointment cancelled', 'success');
      loadAppointments();
    });
  }

  return card;
}

async function loadAppointments() {
  const pendingList = document.querySelector('[data-pending-list]');
  const upcomingList = document.querySelector('[data-upcoming-list]');
  const pastList = document.querySelector('[data-past-list]');

  const result = await authFetch('/api/appointments/mine');

  if (!result.ok) {
    pendingList.innerHTML = `<p class="appt-empty">${result.message}</p>`;
    return;
  }

  const pending = result.data.filter((a) => a.status === 'pending');
  const upcoming = result.data.filter((a) => a.status === 'confirmed');
  const past = result.data.filter((a) => a.status === 'completed' || a.status === 'cancelled');

  pendingList.innerHTML = pending.length ? '' : '<p class="appt-empty">No pending requests.</p>';
  pending.forEach((a) => pendingList.appendChild(buildApptCard(a)));

  upcomingList.innerHTML = upcoming.length ? '' : '<p class="appt-empty">No confirmed appointments yet.</p>';
  upcoming.forEach((a) => upcomingList.appendChild(buildApptCard(a)));

  pastList.innerHTML = past.length ? '' : '<p class="appt-empty">No past appointments.</p>';
  past.forEach((a) => pastList.appendChild(buildApptCard(a)));
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'doctor',
    onReady: () => loadAppointments()
  });
});