import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

function buildDepartmentCard(dept, onDelete) {
  const card = document.createElement('div');
  card.className = 'hosp-card hosp-card--dept';

  const doctorLine = dept.doctorCount > 0
    ? `${dept.doctorCount} doctor${dept.doctorCount === 1 ? '' : 's'}: ${dept.doctorNames.join(', ')}`
    : 'No doctors assigned to this department yet';

  const bedLine = dept.hasBeds
    ? `${dept.availableBeds} / ${dept.totalBeds} beds available`
    : 'No beds linked to this department';

  card.innerHTML = `
    <div class="hosp-card__info">
      <h3>${dept.name}</h3>
      ${dept.description ? `<p>${dept.description}</p>` : ''}
      <div class="hosp-card__tags">
        <span class="hosp-card__tag">${doctorLine}</span>
        <span class="hosp-card__tag">${bedLine}</span>
      </div>
    </div>
    <button type="button" class="btn btn--ghost btn--sm" data-delete-btn>Remove</button>
  `;

  card.querySelector('[data-delete-btn]').addEventListener('click', async () => {
    if (!window.confirm(`Remove the ${dept.name} department?`)) return;
    const result = await authFetch(`/api/hospital/departments/${dept.id}`, { method: 'DELETE' });
    if (!result.ok) return showToast(result.message);
    showToast('Department removed', 'success');
    loadDepartments();
  });

  return card;
}

async function loadDepartments() {
  const list = document.querySelector('[data-department-list]');
  const result = await authFetch('/api/hospital/departments');

  if (!result.ok) {
    list.innerHTML = `<p class="hosp-empty">${result.message}</p>`;
    return;
  }

  if (result.data.length === 0) {
    list.innerHTML = '<p class="hosp-empty">No departments added yet.</p>';
    return;
  }

  list.innerHTML = '';
  result.data.forEach((dept) => list.appendChild(buildDepartmentCard(dept, loadDepartments)));
}

function initAddForm() {
  const form = document.querySelector('[data-add-department-form]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.name.value.trim()) {
      return showToast('Department name is required');
    }

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    const result = await authFetch('/api/hospital/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name.value, description: form.description.value })
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Add department';

    if (!result.ok) {
      showToast(result.message);
      return;
    }

    showToast('Department added', 'success');
    form.reset();
    loadDepartments();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'hospital',
    onReady: () => {
      initAddForm();
      loadDepartments();
    }
  });
});