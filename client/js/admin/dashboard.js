import { initAdminPage } from './adminGuard.js';
import { authFetch } from '../services/apiService.js';

async function loadCounts() {
  const result = await authFetch('/api/admin/analytics');
  if (!result.ok) return;

  const byStatusMap = Object.fromEntries(result.data.byStatus.map((s) => [s.status, s.count]));

  document.querySelector('[data-count-total]').textContent = result.data.totalUsers;
  document.querySelector('[data-count-pending]').textContent = byStatusMap.pending || 0;
  document.querySelector('[data-count-verified]').textContent = byStatusMap.verified || 0;
}

document.addEventListener('DOMContentLoaded', () => {
  initAdminPage(() => loadCounts());
});