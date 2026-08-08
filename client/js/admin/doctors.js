import { initAdminPage } from './adminGuard.js';
import { initProviderReviewPage } from './providerReview.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';
import { showPromptModal } from '../components/modal.js';

function buildDegreeCard(entry, onDecision) {
  const submitted = new Date(entry.submittedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const card = document.createElement('article');
  card.className = 'review-card';
  card.dataset.open = 'true';

  card.innerHTML = `
    <div class="review-card__head">
      <div class="review-card__identity">
        <span class="status-badge status-badge--pending">pending</span>
        <div class="review-card__meta">
          <h3>${entry.fullName} — ${entry.degree}</h3>
          <p>${entry.doctorEmail} · Submitted ${submitted}</p>
        </div>
      </div>
    </div>
    <div class="review-card__body">
      <div class="review-docs">
        <a href="${entry.certificateViewUrl}" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H15M10 3V9L5 18C4.5 19 5 20 6.5 20H17.5C19 20 19.5 19 19 18L14 9V3" stroke-linejoin="round"/></svg>
          View ${entry.degree} certificate
        </a>
      </div>
      <div class="review-actions">
        <button type="button" class="btn btn--primary btn--sm" data-approve-btn>Approve</button>
        <button type="button" class="btn btn--ghost btn--sm" data-reject-btn>Reject</button>
      </div>
    </div>
  `;

  card.querySelector('[data-approve-btn]').addEventListener('click', () => {
    onDecision(entry.userId, entry.degreeId, 'verified', card);
  });

  card.querySelector('[data-reject-btn]').addEventListener('click', async () => {
    const reason = await showPromptModal({
      title: `Reject ${entry.degree} submission`,
      message: `This reason will be shown to ${entry.fullName}.`,
      placeholder: 'e.g. Certificate is unreadable, please re-upload a clearer scan',
      confirmLabel: 'Reject degree',
      tone: 'danger'
    });
    if (reason === null) return;
    onDecision(entry.userId, entry.degreeId, 'rejected', card, reason);
  });

  return card;
}

async function loadDegreeUpdates() {
  const list = document.querySelector('[data-degree-updates-list]');
  list.innerHTML = '<p class="review-empty">Loading...</p>';

  const result = await authFetch('/api/admin/doctors/degree-updates');

  if (!result.ok) {
    list.innerHTML = `<p class="review-empty">${result.message}</p>`;
    return;
  }

  if (result.data.length === 0) {
    list.innerHTML = '<p class="review-empty">No pending degree updates right now.</p>';
    return;
  }

  list.innerHTML = '';

  const handleDecision = async (userId, degreeId, decision, card, reason) => {
    const reviewResult = await authFetch(`/api/admin/doctors/${userId}/degrees/${degreeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, reason })
    });

    if (!reviewResult.ok) {
      showToast(reviewResult.message);
      return;
    }

    showToast(decision === 'verified' ? 'Degree approved' : 'Degree rejected', 'success');
    card.remove();

    if (!list.querySelector('.review-card')) {
      list.innerHTML = '<p class="review-empty">No pending degree updates right now.</p>';
    }
  };

  result.data.forEach((entry) => list.appendChild(buildDegreeCard(entry, handleDecision)));
}

function initDegreeTab() {
  const degreeTab = document.querySelector('[data-degree-tab]');
  const reviewList = document.querySelector('[data-review-list]');
  const degreeList = document.querySelector('[data-degree-updates-list]');
  const statusTabs = document.querySelectorAll('[data-status-tab]');

  degreeTab.addEventListener('click', () => {
    statusTabs.forEach((tab) => tab.setAttribute('data-active', 'false'));
    degreeTab.setAttribute('data-active', 'true');
    reviewList.hidden = true;
    degreeList.hidden = false;
    loadDegreeUpdates();
  });

  statusTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      degreeTab.setAttribute('data-active', 'false');
      degreeList.hidden = true;
      reviewList.hidden = false;
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAdminPage(() => {
    initProviderReviewPage('doctor');
    initDegreeTab();
  });
});