import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

const ROLE_LABELS = {
  doctor: 'Doctor',
  hospital: 'Hospital',
  lab: 'Diagnostic Lab',
  pharmacy: 'Pharmacy',
  ambulance: 'Ambulance'
};

const PRIMARY_NAME_FIELD = {
  doctor: 'fullName',
  hospital: 'hospitalName',
  lab: 'labName',
  pharmacy: 'pharmacyName',
  ambulance: 'driverName'
};

function fieldRow(label, value) {
  return `<div class="review-field"><label>${label}</label><span>${value}</span></div>`;
}

function buildFields(entry) {
  const rejectionRow =
    entry.verificationStatus === 'rejected' && entry.rejectionReason
      ? fieldRow('Rejection reason', entry.rejectionReason)
      : '';

  if (entry.role === 'doctor') {
    return (
      rejectionRow +
      fieldRow('Specialization', entry.specialization) +
      fieldRow('Degree', entry.degree) +
      fieldRow('Registration number', entry.registrationNumber)
    );
  }
  if (entry.role === 'hospital') {
    return rejectionRow + fieldRow('Address', entry.address) + fieldRow('License number', entry.licenseNumber);
  }
  if (entry.role === 'lab') {
    return rejectionRow + fieldRow('License number', entry.licenseNumber);
  }
  if (entry.role === 'pharmacy') {
    return rejectionRow + fieldRow('Drug license number', entry.drugLicenseNumber);
  }
  if (entry.role === 'ambulance') {
    return (
      rejectionRow +
      fieldRow('Vehicle number', entry.vehicleNumber) +
      fieldRow('Driver license number', entry.driverLicenseNumber)
    );
  }
  return rejectionRow;
}

function buildDocLinks(entry) {
  return entry.documents
    .map((doc) => {
      if (!doc.url) {
        return `
      <span class="review-docs__missing">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H15M10 3V9L5 18C4.5 19 5 20 6.5 20H17.5C19 20 19.5 19 19 18L14 9V3" stroke-linejoin="round"/></svg>
        ${doc.label} — not on file
      </span>`;
      }
      return `
      <a href="${doc.url}" target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H15M10 3V9L5 18C4.5 19 5 20 6.5 20H17.5C19 20 19.5 19 19 18L14 9V3" stroke-linejoin="round"/></svg>
        ${doc.label}
      </a>`;
    })
    .join('');
}

function statusBadgeClass(status) {
  if (status === 'verified') return 'status-badge status-badge--verified';
  if (status === 'rejected') return 'status-badge status-badge--rejected';
  return 'status-badge status-badge--pending';
}

function buildCard(entry, role, onDecision) {
  const name = entry[PRIMARY_NAME_FIELD[role]] || entry.email;
  const submitted = new Date(entry.submittedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const card = document.createElement('article');
  card.className = 'review-card';
  card.dataset.open = 'false';

  const actionsHtml =
    entry.verificationStatus === 'pending'
      ? `<div class="review-actions">
          <button type="button" class="btn btn--primary btn--sm" data-approve-btn>Approve</button>
          <button type="button" class="btn btn--ghost btn--sm" data-reject-btn>Reject</button>
        </div>`
      : '';

  card.innerHTML = `
    <div class="review-card__head" data-card-toggle>
      <div class="review-card__identity">
        <span class="${statusBadgeClass(entry.verificationStatus)}">${entry.verificationStatus}</span>
        <div class="review-card__meta">
          <h3>${name}</h3>
          <p>${entry.email} · ${entry.phone} · Submitted ${submitted}</p>
        </div>
      </div>
      <svg class="review-card__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9L12 15L18 9" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div class="review-card__body">
      <div class="review-fields">${buildFields(entry)}</div>
      <div class="review-docs">${buildDocLinks(entry)}</div>
      ${actionsHtml}
    </div>
  `;

  card.querySelector('[data-card-toggle]').addEventListener('click', () => {
    card.dataset.open = card.dataset.open === 'true' ? 'false' : 'true';
  });

  const approveBtn = card.querySelector('[data-approve-btn]');
  const rejectBtn = card.querySelector('[data-reject-btn]');

  if (approveBtn) {
    approveBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      onDecision(entry.userId, 'approved', card);
    });
  }

  if (rejectBtn) {
    rejectBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      const reason = window.prompt(
        `Reason for rejecting this ${ROLE_LABELS[role].toLowerCase()} application? This will be shown to the applicant.`
      );
      if (reason === null) return;
      if (!reason.trim()) {
        showToast('A rejection reason is required');
        return;
      }
      onDecision(entry.userId, 'rejected', card, reason.trim());
    });
  }

  return card;
}

function renderEmptyState(message) {
  const list = document.querySelector('[data-review-list]');
  list.innerHTML = `<p class="review-empty">${message}</p>`;
}

async function loadProviders(role, status) {
  const list = document.querySelector('[data-review-list]');
  list.innerHTML = '<p class="review-empty">Loading...</p>';

  const result = await authFetch(`/api/admin/providers/${role}?status=${status}`);

  if (!result.ok) {
    renderEmptyState(result.message);
    return;
  }

  if (result.data.length === 0) {
    renderEmptyState(`No ${status === 'all' ? '' : status + ' '}applications right now.`);
    return;
  }

  list.innerHTML = '';

  const handleDecision = async (userId, decision, card, reason) => {
    const verifyResult = await authFetch(`/api/admin/verify/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, reason })
    });

    if (!verifyResult.ok) {
      showToast(verifyResult.message);
      return;
    }

    showToast(decision === 'approved' ? 'Application approved' : 'Application rejected', 'success');
    card.remove();

    if (!list.querySelector('.review-card')) {
      renderEmptyState(`No ${status === 'all' ? '' : status + ' '}applications right now.`);
    }
  };

  result.data.forEach((entry) => list.appendChild(buildCard(entry, role, handleDecision)));
}

function initProviderReviewPage(role) {
  let currentStatus = 'pending';

  document.querySelectorAll('[data-status-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-status-tab]').forEach((el) => el.setAttribute('data-active', 'false'));
      tab.setAttribute('data-active', 'true');
      currentStatus = tab.dataset.statusTab;
      loadProviders(role, currentStatus);
    });
  });

  loadProviders(role, currentStatus);
}

export { initProviderReviewPage };