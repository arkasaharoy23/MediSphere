import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

function statusBadgeClass(status) {
  return `status-badge status-badge--${status}`;
}

function statusLabel(status) {
  const labels = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    out_for_delivery: 'Out for delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  };
  return labels[status] || status;
}

function buildItemsList(items) {
  return `<ul class="order-items">${items.map((item) => `<li>${item.quantity} × ${item.medicineName}</li>`).join('')}</ul>`;
}

function buildActionArea(order) {
  if (order.status === 'pending') {
    return `
      <button type="button" class="btn btn--primary btn--sm" data-status-btn="confirmed">Confirm order</button>
      <button type="button" class="btn btn--ghost btn--sm" data-status-btn="cancelled">Cancel</button>
    `;
  }
  if (order.status === 'confirmed') {
    return `<button type="button" class="btn btn--primary btn--sm" data-status-btn="out_for_delivery">Mark out for delivery</button>`;
  }
  if (order.status === 'out_for_delivery') {
    return `<button type="button" class="btn btn--primary btn--sm" data-status-btn="delivered">Mark delivered</button>`;
  }
  return '';
}

function buildOrderCard(order) {
  const card = document.createElement('div');
  card.className = 'hosp-card';

  const dateLabel = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  card.innerHTML = `
    <div class="hosp-card__info">
      <h3>${order.patientEmail} <span class="${statusBadgeClass(order.status)}">${statusLabel(order.status)}</span></h3>
      <p>₹${order.totalAmount} · ${dateLabel} · ${order.deliveryAddress}</p>
      ${buildItemsList(order.items)}
      ${order.prescriptionViewUrl ? `<a href="${order.prescriptionViewUrl}" target="_blank" rel="noopener" style="font-size:0.82rem;color:var(--color-teal);">View attached prescription</a>` : ''}
    </div>
    <div class="hosp-card__meta">${buildActionArea(order)}</div>
  `;

  card.querySelectorAll('[data-status-btn]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const status = btn.dataset.statusBtn;
      if (status === 'cancelled' && !window.confirm('Cancel this order? Stock will be restored.')) return;

      const result = await authFetch(`/api/orders/${order.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!result.ok) return showToast(result.message);
      showToast('Order updated', 'success');
      loadOrders();
    });
  });

  return card;
}

async function loadOrders() {
  const list = document.querySelector('[data-order-list]');
  const result = await authFetch('/api/orders/mine');

  if (!result.ok) {
    list.innerHTML = `<p class="hosp-empty">${result.message}</p>`;
    return;
  }

  if (result.data.length === 0) {
    list.innerHTML = '<p class="hosp-empty">No orders yet.</p>';
    return;
  }

  list.innerHTML = '';
  result.data.forEach((order) => list.appendChild(buildOrderCard(order)));
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'pharmacy',
    onReady: () => loadOrders()
  });
});