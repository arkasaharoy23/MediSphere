import { initDashboard } from '../utils/dashboardAuth.js';

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'hospital',
    onReady: (session) => {
      if (session.verificationStatus !== 'verified') {
        document.querySelector('[data-feature-grid]').setAttribute('hidden', '');
      }
    }
  });
});