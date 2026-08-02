import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';

function buildRow(patient) {
  const row = document.createElement('tr');

  const lastVisit = patient.lastVisit
    ? new Date(patient.lastVisit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  row.innerHTML = `
    <td>${patient.fullName}</td>
    <td>${patient.email}</td>
    <td><span class="blood-group-badge">${patient.bloodGroup}</span></td>
    <td>${patient.appointmentCount}</td>
    <td>${lastVisit}</td>
  `;

  return row;
}

async function loadPatients() {
  const tbody = document.querySelector('[data-patients-tbody]');
  const result = await authFetch('/api/doctor/patients');

  if (!result.ok) {
    tbody.innerHTML = `<tr><td colspan="5">${result.message}</td></tr>`;
    return;
  }

  if (result.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">No patients yet — appointments create this list.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  result.data
    .sort((a, b) => new Date(b.lastVisit || 0) - new Date(a.lastVisit || 0))
    .forEach((p) => tbody.appendChild(buildRow(p)));
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'doctor',
    onReady: () => loadPatients()
  });
});