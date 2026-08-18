import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';

const LOW_STOCK_THRESHOLD = 10;

async function loadStats() {
  const [medicinesResult, ordersResult] = await Promise.all([
    authFetch('/api/pharmacy/medicines'),
    authFetch('/api/orders/mine')
  ]);

  if (medicinesResult.ok) {
    const medicines = medicinesResult.data;
    const lowStock = medicines.filter((m) => m.stock <= LOW_STOCK_THRESHOLD).length;

    document.querySelector('[data-medicine-count]').textContent =
      `${medicines.length} medicine${medicines.length === 1 ? '' : 's'} listed`;
    document.querySelector('[data-low-stock-count]').textContent =
      lowStock > 0 ? `${lowStock} running low` : 'All stock levels healthy';
  }

  if (ordersResult.ok) {
    const active = ordersResult.data.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;
    document.querySelector('[data-order-count]').textContent = `${active} active order${active === 1 ? '' : 's'}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'pharmacy',
    onReady: (session) => {
      if (session.verificationStatus !== 'verified') {
        document.querySelector('[data-feature-grid]').setAttribute('hidden', '');
        return;
      }
      loadStats();
    }
  });
});