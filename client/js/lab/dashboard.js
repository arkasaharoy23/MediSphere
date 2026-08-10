import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';

async function loadStats() {
  const [testsResult, bookingsResult] = await Promise.all([
    authFetch('/api/lab/tests'),
    authFetch('/api/test-bookings/mine')
  ]);

  if (testsResult.ok) {
    const el = document.querySelector('[data-test-count]');
    el.textContent = `${testsResult.data.length} test${testsResult.data.length === 1 ? '' : 's'} listed`;
  }

  if (bookingsResult.ok) {
    const active = bookingsResult.data.filter((b) => !['completed', 'cancelled'].includes(b.status)).length;
    const completed = bookingsResult.data.filter((b) => b.status === 'completed').length;

    const bookingEl = document.querySelector('[data-booking-count]');
    bookingEl.textContent = `${active} active booking${active === 1 ? '' : 's'}`;

    const reportEl = document.querySelector('[data-report-count]');
    reportEl.textContent = `${completed} report${completed === 1 ? '' : 's'} issued`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'lab',
    onReady: (session) => {
      if (session.verificationStatus !== 'verified') {
        document.querySelector('[data-feature-grid]').setAttribute('hidden', '');
        return;
      }
      loadStats();
    }
  });
});