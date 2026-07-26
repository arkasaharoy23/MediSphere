import { initDashboard } from '../utils/dashboardAuth.js';

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'ambulance',
    onReady: (session) => {
      if (session.verificationStatus !== 'verified') {
        document.querySelector('[data-feature-grid]').setAttribute('hidden', '');
      }
    }
  });
});