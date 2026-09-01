import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';

async function loadStats() {
  const [requestsResult, profileResult] = await Promise.all([
    authFetch('/api/ambulance/requests'),
    authFetch('/api/ambulance/profile')
  ]);

  if (requestsResult.ok) {
    const active = requestsResult.data.filter((r) => r.status === 'active').length;
    const el = document.querySelector('[data-request-count]');
    if (el) el.textContent = `${active} active request${active === 1 ? '' : 's'}`;
  }

  if (profileResult.ok && profileResult.data) {
    const el = document.querySelector('[data-availability-status]');
    if (el) el.textContent = profileResult.data.available ? 'Currently available' : 'Currently unavailable';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'ambulance',
    onReady: (session) => {
      if (session.verificationStatus !== 'verified') {
        document.querySelector('[data-feature-grid]').setAttribute('hidden', '');
        return;
      }
      loadStats();
    }
  });
});