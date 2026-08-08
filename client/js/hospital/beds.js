import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

function buildBedCard(bed) {
  const card = document.createElement('div');
  card.className = 'bed-card';

  const occupiedPercent = bed.total > 0 ? Math.round(((bed.total - bed.available) / bed.total) * 100) : 0;
  const isLow = bed.available === 0;

  card.innerHTML = `
    <div class="bed-card__head">
      <h3>${bed.category}</h3>
      <button type="button" class="btn btn--ghost btn--sm" data-delete-btn>Remove</button>
    </div>
    <div class="bed-card__count">${bed.available} <span>/ ${bed.total} available</span></div>
    <div class="bed-card__bar">
      <div class="bed-card__bar-fill${isLow ? ' bed-card__bar-fill--low' : ''}" style="width: ${occupiedPercent}%;"></div>
    </div>
    <div class="bed-card__actions">
      <div class="form-field">
        <label>Total</label>
        <input type="number" min="0" value="${bed.total}" data-total-input>
      </div>
      <div class="form-field">
        <label>Available</label>
        <input type="number" min="0" value="${bed.available}" data-available-input>
      </div>
      <button type="button" class="btn btn--primary btn--sm" data-update-btn style="align-self: flex-end;">Update</button>
    </div>
  `;

  card.querySelector('[data-update-btn]').addEventListener('click', async () => {
    const total = card.querySelector('[data-total-input]').value;
    const available = card.querySelector('[data-available-input]').value;

    const result = await authFetch(`/api/hospital/beds/${bed.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ total, available })
    });

    if (!result.ok) return showToast(result.message);
    showToast('Bed availability updated', 'success');
    loadBeds();
  });

  card.querySelector('[data-delete-btn]').addEventListener('click', async () => {
    if (!window.confirm(`Remove the ${bed.category} bed category?`)) return;
    const result = await authFetch(`/api/hospital/beds/${bed.id}`, { method: 'DELETE' });
    if (!result.ok) return showToast(result.message);
    showToast('Bed category removed', 'success');
    loadBeds();
  });

  return card;
}

async function loadBeds() {
  const list = document.querySelector('[data-bed-list]');
  const result = await authFetch('/api/hospital/beds');

  if (!result.ok) {
    list.innerHTML = `<p class="hosp-empty">${result.message}</p>`;
    return;
  }

  if (result.data.length === 0) {
    list.innerHTML = '<p class="hosp-empty">No bed categories added yet.</p>';
    return;
  }

  list.innerHTML = '';
  result.data.forEach((bed) => list.appendChild(buildBedCard(bed)));
}

function initAddForm() {
  const form = document.querySelector('[data-add-bed-form]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.category.value.trim()) {
      return showToast('Category name is required');
    }
    if (Number(form.available.value) > Number(form.total.value)) {
      return showToast('Available beds cannot exceed total beds');
    }

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    const result = await authFetch('/api/hospital/beds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: form.category.value,
        total: form.total.value,
        available: form.available.value
      })
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Add category';

    if (!result.ok) {
      showToast(result.message);
      return;
    }

    showToast('Bed category added', 'success');
    form.reset();
    loadBeds();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'hospital',
    onReady: () => {
      initAddForm();
      loadBeds();
    }
  });
});