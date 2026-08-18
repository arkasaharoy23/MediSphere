import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

function buildInventoryCard(med) {
  const card = document.createElement('div');
  card.className = 'hosp-card';

  card.innerHTML = `
    <div class="hosp-card__info">
      <h3>${med.name}${med.requiresPrescription ? '<span class="rx-badge">Rx</span>' : ''}</h3>
      <p><span class="stock-badge${med.stock <= 10 ? ' stock-badge--low' : ''}">${med.stock} currently in stock</span></p>
    </div>
    <div class="hosp-card__meta">
      <input type="number" min="0" value="${med.stock}" data-stock-input class="stock-input">
      <button type="button" class="btn btn--primary btn--sm" data-update-btn>Update</button>
    </div>
  `;

  card.querySelector('[data-update-btn]').addEventListener('click', async () => {
    const stock = card.querySelector('[data-stock-input]').value;

    const result = await authFetch(`/api/pharmacy/medicines/${med._id}/stock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock })
    });

    if (!result.ok) return showToast(result.message);
    showToast('Stock updated', 'success');
    loadInventory();
  });

  return card;
}

async function loadInventory() {
  const list = document.querySelector('[data-inventory-list]');
  const result = await authFetch('/api/pharmacy/medicines');

  if (!result.ok) {
    list.innerHTML = `<p class="hosp-empty">${result.message}</p>`;
    return;
  }

  if (result.data.length === 0) {
    list.innerHTML = '<p class="hosp-empty">No medicines in your catalog yet — add some from the Medicines page first.</p>';
    return;
  }

  list.innerHTML = '';
  result.data.forEach((med) => list.appendChild(buildInventoryCard(med)));
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'pharmacy',
    onReady: () => loadInventory()
  });
});