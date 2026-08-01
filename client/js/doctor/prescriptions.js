import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

let medicineRowCount = 0;

function buildMedicineRow() {
  medicineRowCount += 1;
  const row = document.createElement('div');
  row.className = 'medicine-row';
  row.innerHTML = `
    <input type="text" placeholder="Medicine name" data-med-name required>
    <input type="text" placeholder="Dosage" data-med-dosage required>
    <input type="text" placeholder="Frequency" data-med-frequency required>
    <input type="text" placeholder="Duration" data-med-duration required>
    <button type="button" class="medicine-row__remove" data-remove-row aria-label="Remove medicine">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6L18 18" stroke-linecap="round"/></svg>
    </button>
  `;

  row.querySelector('[data-remove-row]').addEventListener('click', () => {
    const container = document.querySelector('[data-medicine-rows]');
    if (container.children.length > 1) {
      row.remove();
    } else {
      showToast('At least one medicine is required');
    }
  });

  return row;
}

function initMedicineRows() {
  const container = document.querySelector('[data-medicine-rows]');
  container.appendChild(buildMedicineRow());

  document.querySelector('[data-add-medicine-btn]').addEventListener('click', () => {
    container.appendChild(buildMedicineRow());
  });
}

async function loadPatientOptions() {
  const select = document.querySelector('[data-patient-select]');
  const result = await authFetch('/api/doctor/patients');

  if (!result.ok || result.data.length === 0) {
    select.innerHTML = '<option value="">No patients yet — appointments create this list</option>';
    return;
  }

  select.innerHTML = '<option value="">Choose a patient</option>';
  result.data.forEach((p) => {
    const option = document.createElement('option');
    option.value = p.patientId;
    option.textContent = p.fullName;
    select.appendChild(option);
  });
}

function initForm() {
  const form = document.querySelector('[data-prescription-form]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const patientId = document.querySelector('[data-patient-select]').value;
    if (!patientId) return showToast('Please choose a patient');

    const rows = document.querySelectorAll('[data-medicine-rows] .medicine-row');
    const medicines = [];

    for (const row of rows) {
      const name = row.querySelector('[data-med-name]').value.trim();
      const dosage = row.querySelector('[data-med-dosage]').value.trim();
      const frequency = row.querySelector('[data-med-frequency]').value.trim();
      const duration = row.querySelector('[data-med-duration]').value.trim();

      if (!name || !dosage || !frequency || !duration) {
        return showToast('Fill in every field for each medicine');
      }
      medicines.push({ name, dosage, frequency, duration });
    }

    const notes = document.querySelector('[data-prescription-notes]').value;

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const result = await authFetch('/api/prescriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, medicines, notes })
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Issue prescription';

    if (!result.ok) {
      showToast(result.message);
      return;
    }

    showToast('Prescription issued', 'success');
    form.reset();
    document.querySelector('[data-medicine-rows]').innerHTML = '';
    document.querySelector('[data-medicine-rows]').appendChild(buildMedicineRow());
    loadPrescriptions();
  });
}

function buildMedicineTable(medicines) {
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
      <thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildPrescriptionCard(p) {
  const card = document.createElement('article');
  card.className = 'record-card';

  const date = new Date(p.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  card.innerHTML = `
    <div class="record-card__head">
      <h3>${p.patientName}</h3>
      <span class="record-card__date">${date}</span>
    </div>
    ${buildMedicineTable(p.medicines)}
    ${p.notes ? `<p>${p.notes}</p>` : ''}
  `;

  return card;
}

async function loadPrescriptions() {
  const list = document.querySelector('[data-prescription-list]');
  const result = await authFetch('/api/prescriptions/mine');

  if (!result.ok) {
    list.innerHTML = `<p class="record-empty">${result.message}</p>`;
    return;
  }

  if (result.data.length === 0) {
    list.innerHTML = '<p class="record-empty">No prescriptions issued yet.</p>';
    return;
  }

  list.innerHTML = '';
  result.data.forEach((p) => list.appendChild(buildPrescriptionCard(p)));
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'doctor',
    onReady: () => {
      initMedicineRows();
      loadPatientOptions();
      initForm();
      loadPrescriptions();
    }
  });
});