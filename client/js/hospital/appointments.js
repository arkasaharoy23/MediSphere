import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';

function statusBadgeClass(status) {
  return `status-badge status-badge--${status}`;
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
      <h3>${appt.doctorName} <span style="font-weight:400;color:var(--color-ink-soft);">— ${appt.doctorSpecialization}</span></h3>
      <p>${appt.patientEmail} · ${dateLabel} at ${appt.timeSlot}</p>
    </div>
    <div class="appt-card__meta">
      <span class="${statusBadgeClass(appt.status)}">${appt.status}</span>
    </div>
  `;

  return card;
}

async function loadAppointments() {
  const list = document.querySelector('[data-appt-list]');
  const result = await authFetch('/api/hospital/appointments');

  if (!result.ok) {
    list.innerHTML = `<p class="appt-empty">${result.message}</p>`;
    return;
  }

  if (result.data.length === 0) {
    list.innerHTML = '<p class="appt-empty">No appointments booked with your affiliated doctors yet.</p>';
    return;
  }

  list.innerHTML = '';
  result.data.forEach((appt) => list.appendChild(buildApptCard(appt)));
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'hospital',
    onReady: () => loadAppointments()
  });
});