import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

function statusBadgeClass(status) {
  return `status-badge status-badge--${status}`;
}

function buildRequestCard(request) {
  const card = document.createElement('div');
  card.className = 'hosp-card';

  const dateLabel = new Date(request.createdAt).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  const mapsUrl = `https://www.google.com/maps?q=${request.location.lat},${request.location.lng}`;

  card.innerHTML = `
    <div class="hosp-card__info">
      <h3>${request.patientEmail} <span class="${statusBadgeClass(request.status)}">${request.status}</span></h3>
      <p>Blood group: ${request.bloodGroup} · ${dateLabel}</p>
      ${request.emergencyContactName ? `<p>Emergency contact: ${request.emergencyContactName}${request.emergencyContactPhone ? ' · ' + request.emergencyContactPhone : ''}</p>` : ''}
      <a href="${mapsUrl}" target="_blank" rel="noopener" style="font-size:0.82rem;color:var(--color-teal);">View location on map</a>
    </div>
    <div class="hosp-card__meta">
      ${request.status === 'active' ? '<button type="button" class="btn btn--primary btn--sm" data-resolve-btn>Mark resolved</button>' : ''}
    </div>
  `;

  const resolveBtn = card.querySelector('[data-resolve-btn]');
  if (resolveBtn) {
    resolveBtn.addEventListener('click', async () => {
      if (!window.confirm('Mark this emergency request as resolved?')) return;

      const result = await authFetch(`/api/ambulance/requests/${request.id}/resolve`, { method: 'PUT' });
      if (!result.ok) return showToast(result.message);
      showToast('Request marked resolved', 'success');
      loadRequests();
    });
  }

  return card;
}

async function loadRequests() {
  const list = document.querySelector('[data-request-list]');
  const result = await authFetch('/api/ambulance/requests');

  if (!result.ok) {
    list.innerHTML = `<p class="hosp-empty">${result.message}</p>`;
    return;
  }

  if (result.data.length === 0) {
    list.innerHTML = '<p class="hosp-empty">No emergency requests assigned to you yet.</p>';
    return;
  }

  list.innerHTML = '';
  result.data.forEach((request) => list.appendChild(buildRequestCard(request)));
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'ambulance',
    onReady: () => {
      loadRequests();
      setInterval(loadRequests, 30000);
    }
  });
});