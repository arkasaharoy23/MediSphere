import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

function buildMedicineCard(med) {
  const card = document.createElement('div');
  card.className = 'hosp-card';

  card.innerHTML = `
    <div class="hosp-card__info">
      <h3>${med.name}${med.requiresPrescription ? '<span class="rx-badge">Rx</span>' : ''}</h3>
      ${med.description ? `<p>${med.description}</p>` : ''}
      <p>₹${med.price} · <span class="stock-badge${med.stock <= 10 ? ' stock-badge--low' : ''}">${med.stock} in stock</span></p>
    </div>
    <button type="button" class="btn btn--ghost btn--sm" data-delete-btn>Remove</button>
  `;

  card.querySelector('[data-delete-btn]').addEventListener('click', async () => {
    if (!window.confirm(`Remove "${med.name}" from your catalog?`)) return;
    const result = await authFetch(`/api/pharmacy/medicines/${med._id}`, { method: 'DELETE' });
    if (!result.ok) return showToast(result.message);
    showToast('Medicine removed', 'success');
    loadMedicines();
  });

  return card;
}

async function loadMedicines() {
  const list = document.querySelector('[data-medicine-list]');
  const result = await authFetch('/api/pharmacy/medicines');

  if (!result.ok) {
    list.innerHTML = `<p class="hosp-empty">${result.message}</p>`;
    return;
  }

  if (result.data.length === 0) {
    list.innerHTML = '<p class="hosp-empty">No medicines added yet.</p>';
    return;
  }

  list.innerHTML = '';
  result.data.forEach((med) => list.appendChild(buildMedicineCard(med)));
}

function initAddForm() {
  const form = document.querySelector('[data-add-medicine-form]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.name.value.trim()) {
      return showToast('Medicine name is required');
    }

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    const result = await authFetch('/api/pharmacy/medicines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.value,
        description: form.description.value,
        price: form.price.value,
        stock: form.stock.value,
        requiresPrescription: form.requiresPrescription.checked
      })
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Add medicine';

    if (!result.ok) {
      showToast(result.message);
      return;
    }

    showToast('Medicine added', 'success');
    form.reset();
    loadMedicines();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'pharmacy',
    onReady: () => {
      initAddForm();
      loadMedicines();
    }
  });
});