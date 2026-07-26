import { initDashboard } from '../utils/dashboardAuth.js';

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({ expectedRole: 'patient' });
});