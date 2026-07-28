import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function typeLabel(type) {
  if (type === 'prescription') return 'Prescription';
  if (type === 'lab_report') return 'Lab Report';
  if (type === 'visit_summary') return 'Visit Summary';
  return 'Record';
}

function buildMedicineTable(medicines) {
  if (!medicines || medicines.length === 0) return '';

  const rows = medicines
    .map(
      (m) => `
      <tr>
        <td>${m.name}</td>
        <td>${m.dosage}</td>
        <td>${m.frequency}</td>
        <td>${m.duration}</td>
      </tr>`
    )
    .join('');

  return `
    <table class="medicine-table">
      <thead>
        <tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildCard(item) {
  const card = document.createElement('article');
  card.className = 'record-card';

  const docLink = item.documentUrl
    ? `<a href="${item.documentUrl}" target="_blank" rel="noopener noreferrer" class="doc-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H15M10 3V9L5 18C4.5 19 5 20 6.5 20H17.5C19 20 19.5 19 19 18L14 9V3" stroke-linejoin="round"/></svg>
        View document
      </a>`
    : '';

  card.innerHTML = `
    <span class="record-type-badge">${typeLabel(item.type)}</span>
    <div class="record-card__head">
      <h3>${item.title}</h3>
      <span class="record-card__date">${formatDate(item.createdAt)}</span>
    </div>
    ${buildMedicineTable(item.medicines)}
    ${item.notes ? `<p>${item.notes}</p>` : ''}
    ${docLink}
  `;

  return card;
}

async function loadRecords() {
  const list = document.querySelector('[data-record-list]');
  const result = await authFetch('/api/records/mine');

  if (!result.ok) {
    list.innerHTML = `<p class="record-empty">${result.message}</p>`;
    return;
  }

  if (result.data.length === 0) {
    list.innerHTML = '<p class="record-empty">No medical records yet. Prescriptions and lab reports from your care team will appear here.</p>';
    return;
  }

  list.innerHTML = '';
  result.data.forEach((item) => list.appendChild(buildCard(item)));
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'patient',
    onReady: () => loadRecords()
  });
});