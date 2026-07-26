import { initAdminPage } from './adminGuard.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

function statusBadgeClass(status) {
  if (status === 'verified') return 'status-badge status-badge--verified';
  if (status === 'rejected') return 'status-badge status-badge--rejected';
  return 'status-badge status-badge--pending';
}

function buildRow(user) {
  const row = document.createElement('tr');
  const createdDate = new Date(user.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  row.innerHTML = `
    <td>${user.email}</td>
    <td style="text-transform:capitalize;">${user.role}</td>
    <td><span class="${statusBadgeClass(user.verificationStatus)}">${user.verificationStatus}</span></td>
    <td>${user.isActive ? 'Active' : 'Suspended'}</td>
    <td>${createdDate}</td>
    <td>
      ${
        user.role === 'admin'
          ? ''
          : `<button type="button" class="btn btn--ghost btn--sm" data-toggle-btn>${user.isActive ? 'Suspend' : 'Reactivate'}</button>`
      }
    </td>
  `;

  const toggleBtn = row.querySelector('[data-toggle-btn]');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', async () => {
      const action = user.isActive ? 'suspend' : 'reactivate';
      if (!window.confirm(`${action === 'suspend' ? 'Suspend' : 'Reactivate'} ${user.email}?`)) return;

      const result = await authFetch(`/api/admin/users/${user.userId}/toggle-active`, { method: 'POST' });

      if (!result.ok) {
        showToast(result.message);
        return;
      }

      showToast(`Account ${result.data.isActive ? 'reactivated' : 'suspended'}`, 'success');
      user.isActive = result.data.isActive;
      row.replaceWith(buildRow(user));
    });
  }

  return row;
}

async function loadUsers() {
  const roleFilter = document.querySelector('[data-role-filter]').value;
  const search = document.querySelector('[data-search-input]').value.trim();
  const tbody = document.querySelector('[data-users-tbody]');

  tbody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

  const params = new URLSearchParams();
  if (roleFilter) params.set('role', roleFilter);
  if (search) params.set('search', search);

  const result = await authFetch(`/api/admin/users?${params.toString()}`);

  if (!result.ok) {
    tbody.innerHTML = `<tr><td colspan="6">${result.message}</td></tr>`;
    return;
  }

  if (result.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">No matching users.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  result.data.forEach((user) => tbody.appendChild(buildRow(user)));
}

function initControls() {
  document.querySelector('[data-role-filter]').addEventListener('change', loadUsers);

  let debounceTimer;
  document.querySelector('[data-search-input]').addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadUsers, 350);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAdminPage(() => {
    initControls();
    loadUsers();
  });
});