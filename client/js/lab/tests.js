import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

function buildTestCard(test) {
  const card = document.createElement('div');
  card.className = 'hosp-card';

  card.innerHTML = `
    <div class="hosp-card__info">
      <h3>${test.name}</h3>
      ${test.description ? `<p>${test.description}</p>` : ''}
      <p>₹${test.price} · ${test.turnaroundDays} day${test.turnaroundDays === 1 ? '' : 's'} turnaround</p>
    </div>
    <button type="button" class="btn btn--ghost btn--sm" data-delete-btn>Remove</button>
  `;

  card.querySelector('[data-delete-btn]').addEventListener('click', async () => {
    if (!window.confirm(`Remove "${test.name}" from your catalog?`)) return;
    const result = await authFetch(`/api/lab/tests/${test._id}`, { method: 'DELETE' });
    if (!result.ok) return showToast(result.message);
    showToast('Test removed', 'success');
    loadTests();
  });

  return card;
}

async function loadTests() {
  const list = document.querySelector('[data-test-list]');
  const result = await authFetch('/api/lab/tests');

  if (!result.ok) {
    list.innerHTML = `<p class="hosp-empty">${result.message}</p>`;
    return;
  }

  if (result.data.length === 0) {
    list.innerHTML = '<p class="hosp-empty">No tests added yet.</p>';
    return;
  }

  list.innerHTML = '';
  result.data.forEach((test) => list.appendChild(buildTestCard(test)));
}

function initAddForm() {
  const form = document.querySelector('[data-add-test-form]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.name.value.trim()) {
      return showToast('Test name is required');
    }

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    const result = await authFetch('/api/lab/tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.value,
        description: form.description.value,
        price: form.price.value,
        turnaroundDays: form.turnaroundDays.value
      })
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Add test';

    if (!result.ok) {
      showToast(result.message);
      return;
    }

    showToast('Test added', 'success');
    form.reset();
    loadTests();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'lab',
    onReady: () => {
      initAddForm();
      loadTests();
    }
  });
});