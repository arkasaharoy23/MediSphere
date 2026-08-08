import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';

async function loadStats() {
  const [deptResult, doctorResult, apptResult, bedResult] = await Promise.all([
    authFetch('/api/hospital/departments'),
    authFetch('/api/hospital/doctors'),
    authFetch('/api/hospital/appointments'),
    authFetch('/api/hospital/beds')
  ]);

  if (deptResult.ok) {
    const el = document.querySelector('[data-dept-count]');
    el.textContent = `${deptResult.data.length} department${deptResult.data.length === 1 ? '' : 's'}`;
  }

  if (doctorResult.ok) {
    const el = document.querySelector('[data-doctor-count]');
    el.textContent = `${doctorResult.data.length} affiliated doctor${doctorResult.data.length === 1 ? '' : 's'}`;
  }

  if (apptResult.ok) {
    const upcoming = apptResult.data.filter((a) => a.status === 'pending' || a.status === 'confirmed').length;
    const el = document.querySelector('[data-appt-count]');
    el.textContent = `${upcoming} upcoming appointment${upcoming === 1 ? '' : 's'}`;
  }

  if (bedResult.ok) {
    const totalAvailable = bedResult.data.reduce((sum, b) => sum + b.available, 0);
    const totalBeds = bedResult.data.reduce((sum, b) => sum + b.total, 0);
    const el = document.querySelector('[data-bed-count]');
    el.textContent = `${totalAvailable} / ${totalBeds} beds available`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'hospital',
    onReady: (session) => {
      if (session.verificationStatus !== 'verified') {
        document.querySelector('[data-feature-grid]').setAttribute('hidden', '');
        return;
      }
      loadStats();
    }
  });
});