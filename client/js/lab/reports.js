import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';

function buildReportCard(booking) {
  const card = document.createElement('div');
  card.className = 'hosp-card';

  const dateLabel = new Date(booking.preferredDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  card.innerHTML = `
    <div class="hosp-card__info">
      <h3>${booking.testName}</h3>
      <p>${booking.patientEmail} · ₹${booking.price} · ${dateLabel}</p>
    </div>
    <div class="hosp-card__meta">
      ${booking.reportViewUrl ? `<a href="${booking.reportViewUrl}" target="_blank" rel="noopener" class="btn btn--ghost btn--sm">View report</a>` : ''}
    </div>
  `;

  return card;
}

async function loadReports() {
  const list = document.querySelector('[data-report-list]');
  const result = await authFetch('/api/test-bookings/mine');

  if (!result.ok) {
    list.innerHTML = `<p class="hosp-empty">${result.message}</p>`;
    return;
  }

  const completed = result.data.filter((booking) => booking.status === 'completed');

  if (completed.length === 0) {
    list.innerHTML = '<p class="hosp-empty">No completed reports yet.</p>';
    return;
  }

  list.innerHTML = '';
  completed.forEach((booking) => list.appendChild(buildReportCard(booking)));
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'lab',
    onReady: () => loadReports()
  });
});