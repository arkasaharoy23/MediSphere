import { initAdminPage } from './adminGuard.js';
import { authFetch } from '../services/apiService.js';

const ROLE_LABELS = {
  patient: 'Patient',
  doctor: 'Doctor',
  hospital: 'Hospital',
  lab: 'Lab',
  pharmacy: 'Pharmacy',
  ambulance: 'Ambulance',
  admin: 'Admin'
};

async function loadAnalytics() {
  const result = await authFetch('/api/admin/analytics');

  if (!result.ok) {
    console.error('Analytics fetch failed:', result.message);
    return;
  }

  const { totalUsers, activeCount, suspendedCount, byRole, byStatus } = result.data;

  document.querySelector('[data-count-total]').textContent = totalUsers;
  document.querySelector('[data-count-active]').textContent = activeCount;
  document.querySelector('[data-count-suspended]').textContent = suspendedCount;

  const roleLabels = byRole.map((r) => ROLE_LABELS[r.role] || r.role);
  const roleCounts = byRole.map((r) => r.count);

  if (typeof Chart === 'undefined') {
    console.error('Chart.js failed to load — charts cannot render.');
    return;
  }

  new Chart(document.getElementById('roleChart'), {
    type: 'bar',
    data: {
      labels: roleLabels,
      datasets: [{
        label: 'Accounts',
        data: roleCounts,
        backgroundColor: '#0F766E',
        borderRadius: 6,
        maxBarThickness: 44
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });

  const statusLabels = byStatus.map((s) => s.status);
  const statusCounts = byStatus.map((s) => s.count);
  const statusColors = statusLabels.map((label) => {
    if (label === 'verified') return '#0F766E';
    if (label === 'pending') return '#F97360';
    return '#627D98';
  });

  new Chart(document.getElementById('statusChart'), {
    type: 'doughnut',
    data: {
      labels: statusLabels,
      datasets: [{
        data: statusCounts,
        backgroundColor: statusColors,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAdminPage(() => loadAnalytics());
});