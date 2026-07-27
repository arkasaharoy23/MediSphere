import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

function statusBadgeClass(status) {
  return `status-badge status-badge--${status === 'active' ? 'pending' : status === 'resolved' ? 'confirmed' : 'cancelled'}`;
}

function renderIdleState() {
  const panel = document.querySelector('[data-sos-panel]');
  panel.innerHTML = `
    <h2>Need help right now?</h2>
    <p>One tap shares your live location and key medical details with the responding team.</p>
    <button type="button" class="sos-trigger-btn" data-trigger-btn>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L15 9L22 10L17 15L18 22L12 18.5L6 22L7 15L2 10L9 9L12 2Z" stroke-linejoin="round"/></svg>
      Trigger SOS
    </button>
  `;

  panel.querySelector('[data-trigger-btn]').addEventListener('click', handleTrigger);
}

function renderActiveState(request) {
  const panel = document.querySelector('[data-sos-panel]');
  const time = new Date(request.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  panel.innerHTML = `
    <div class="sos-active-card">
      <div class="sos-active-card__badge">
        <span class="pulse-dot"></span>
        SOS active since ${time}
      </div>
      <dl>
        <dt>Location</dt>
        <dd>${request.location.lat.toFixed(4)}, ${request.location.lng.toFixed(4)}</dd>
        <dt>Blood group</dt>
        <dd>${request.bloodGroup}</dd>
        <dt>Emergency contact</dt>
        <dd>${request.emergencyContactName || 'Not set'} ${request.emergencyContactPhone ? '· ' + request.emergencyContactPhone : ''}</dd>
      </dl>
      <button type="button" class="btn btn--ghost" data-cancel-sos-btn>Cancel SOS</button>
    </div>
  `;

  panel.querySelector('[data-cancel-sos-btn]').addEventListener('click', async () => {
    if (!window.confirm('Cancel this active SOS request?')) return;

    const result = await authFetch(`/api/emergency/${request.id}/cancel`, { method: 'PATCH' });

    if (!result.ok) {
      showToast(result.message);
      return;
    }

    showToast('SOS cancelled', 'success');
    loadState();
  });
}

function handleTrigger() {
  if (!navigator.geolocation) {
    showToast('Your browser does not support location sharing');
    return;
  }

  showToast('Getting your location...');

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      const result = await authFetch('/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: latitude, lng: longitude })
      });

      if (!result.ok) {
        showToast(result.message);
        return;
      }

      showToast('SOS triggered', 'success');
      loadState();
    },
    () => {
      showToast('Location access is required to trigger SOS. Please allow location and try again.');
    }
  );
}

function buildHistoryCard(request) {
  const card = document.createElement('div');
  card.className = 'sos-history-card';

  const date = new Date(request.createdAt).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  card.innerHTML = `
    <div>
      <p>${date}</p>
    </div>
    <span class="${statusBadgeClass(request.status)}">${request.status}</span>
  `;

  return card;
}

async function loadHistory() {
  const list = document.querySelector('[data-sos-history]');
  const result = await authFetch('/api/emergency/mine');

  if (!result.ok) {
    list.innerHTML = `<p class="sos-empty">${result.message}</p>`;
    return { active: null };
  }

  const activeRequest = result.data.find((r) => r.status === 'active');
  const pastRequests = result.data.filter((r) => r.status !== 'active');

  if (pastRequests.length === 0) {
    list.innerHTML = '<p class="sos-empty">No past SOS requests.</p>';
  } else {
    list.innerHTML = '';
    pastRequests.forEach((r) => list.appendChild(buildHistoryCard(r)));
  }

  return { active: activeRequest };
}

async function loadState() {
  const { active } = await loadHistory();

  if (active) {
    renderActiveState(active);
  } else {
    renderIdleState();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'patient',
    onReady: () => {
      loadState();
    }
  });
});