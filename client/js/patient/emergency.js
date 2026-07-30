import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

let currentLocation = null;
let hospitalOptions = [];

function statusBadgeClass(status) {
  return `status-badge status-badge--${status === 'active' ? 'pending' : status === 'resolved' ? 'confirmed' : 'cancelled'}`;
}

function buildHospitalOptionsHtml() {
  if (hospitalOptions.length === 0) {
    return '<option value="">No verified hospitals available yet</option>';
  }

  const options = hospitalOptions
    .map((h) => `<option value="${h.hospitalId}">${h.hospitalName}${h.city ? ' — ' + h.city : ''}</option>`)
    .join('');

  return `<option value="">Auto-assign nearest hospital</option>${options}`;
}

function renderIdleState() {
  const panel = document.querySelector('[data-sos-panel]');
  panel.innerHTML = `
    <h2>Need help right now?</h2>
    <p>One tap shares your live location and key medical details with the responding team.</p>

    <div class="form-field" style="max-width:360px;margin:0 auto var(--space-5);text-align:left;">
      <label for="sos-hospital">Preferred hospital (optional)</label>
      <select id="sos-hospital" data-hospital-select>
        ${buildHospitalOptionsHtml()}
      </select>
    </div>

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

  const ambulanceRow = request.ambulance
    ? `<dt>Ambulance</dt><dd>${request.ambulance.vehicleNumber} · ${request.ambulance.driverName}</dd>`
    : `<dt>Ambulance</dt><dd>No ambulance available nearby yet</dd>`;

  const hospitalRow = request.hospital
    ? `<dt>Hospital</dt><dd>${request.hospital.hospitalName}</dd>`
    : `<dt>Hospital</dt><dd>No hospital matched yet</dd>`;

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
        ${ambulanceRow}
        ${hospitalRow}
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

async function handleTrigger() {
  if (!currentLocation) {
    showToast('Location is required to trigger SOS. Please allow location access and reload the page.');
    return;
  }

  const hospitalSelect = document.querySelector('[data-hospital-select]');
  const hospitalId = hospitalSelect ? hospitalSelect.value : '';

  const payload = { lat: currentLocation.lat, lng: currentLocation.lng };
  if (hospitalId) payload.hospitalId = hospitalId;

  const result = await authFetch('/api/emergency', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!result.ok) {
    showToast(result.message);
    return;
  }

  showToast('SOS triggered', 'success');
  loadState();
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

async function loadHospitalOptions() {
  const params = new URLSearchParams();
  if (currentLocation) {
    params.set('lat', currentLocation.lat);
    params.set('lng', currentLocation.lng);
  }

  const result = await authFetch(`/api/patient/hospitals?${params.toString()}`);
  hospitalOptions = result.ok ? result.data.hospitals : [];
}

function detectLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      currentLocation = null;
      resolve();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        currentLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        resolve();
      },
      () => {
        currentLocation = null;
        resolve();
      }
    );
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'patient',
    onReady: async () => {
      await detectLocation();
      await loadHospitalOptions();
      loadState();
    }
  });
});