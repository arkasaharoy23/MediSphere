import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

function statusBadgeClass(status) {
  return `status-badge status-badge--${status}`;
}

function statusLabel(status) {
  const labels = {
    pending: 'Pending',
    sample_collected: 'Sample collected',
    processing: 'Processing',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };
  return labels[status] || status;
}

function buildActionArea(booking) {
  if (booking.status === 'pending') {
    return `<button type="button" class="btn btn--primary btn--sm" data-status-btn="sample_collected">Mark sample collected</button>`;
  }
  if (booking.status === 'sample_collected') {
    return `<button type="button" class="btn btn--primary btn--sm" data-status-btn="processing">Mark processing</button>`;
  }
  if (booking.status === 'processing') {
    return `
      <label class="form-file" data-report-label style="max-width: 220px;">
        <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke-linejoin="round"/><path d="M14 2V8H20" stroke-linejoin="round"/></svg></span>
        <span data-report-text>Attach report (PDF)</span>
        <input type="file" accept="application/pdf" data-report-input>
      </label>
      <button type="button" class="btn btn--primary btn--sm" data-upload-btn>Upload &amp; complete</button>
    `;
  }
  if (booking.status === 'completed' && booking.reportViewUrl) {
    return `<a href="${booking.reportViewUrl}" target="_blank" rel="noopener" class="btn btn--ghost btn--sm">View report</a>`;
  }
  return '';
}

function buildBookingCard(booking) {
  const card = document.createElement('div');
  card.className = 'hosp-card';

  const dateLabel = new Date(booking.preferredDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  card.innerHTML = `
    <div class="hosp-card__info">
      <h3>${booking.testName} <span class="${statusBadgeClass(booking.status)}">${statusLabel(booking.status)}</span></h3>
      <p>${booking.patientEmail} · ₹${booking.price} · Preferred: ${dateLabel}</p>
    </div>
    <div class="hosp-card__meta">${buildActionArea(booking)}</div>
  `;

  const statusBtn = card.querySelector('[data-status-btn]');
  if (statusBtn) {
    statusBtn.addEventListener('click', async () => {
      const status = statusBtn.dataset.statusBtn;
      const result = await authFetch(`/api/test-bookings/${booking.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!result.ok) return showToast(result.message);
      showToast('Status updated', 'success');
      loadBookings();
    });
  }

  const reportInput = card.querySelector('[data-report-input]');
  const reportLabel = card.querySelector('[data-report-label]');
  const reportText = card.querySelector('[data-report-text]');
  if (reportInput) {
    reportInput.addEventListener('change', () => {
      if (!reportInput.files.length) return;
      const file = reportInput.files[0];
      if (file.type !== 'application/pdf') {
        reportInput.value = '';
        reportLabel.removeAttribute('data-filled');
        reportText.textContent = 'Attach report (PDF)';
        showToast('Please upload a PDF file');
        return;
      }
      reportText.textContent = file.name;
      reportLabel.setAttribute('data-filled', 'true');
    });
  }

  const uploadBtn = card.querySelector('[data-upload-btn]');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
      if (!reportInput.files.length) {
        return showToast('Please attach the report first');
      }

      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Uploading...';

      const formData = new FormData();
      formData.append('testReport', reportInput.files[0]);

      const result = await authFetch(`/api/test-bookings/${booking.id}/report`, {
        method: 'POST',
        body: formData
      });

      uploadBtn.disabled = false;
      uploadBtn.textContent = 'Upload & complete';

      if (!result.ok) return showToast(result.message);
      showToast('Report uploaded, booking completed', 'success');
      loadBookings();
    });
  }

  return card;
}

async function loadBookings() {
  const list = document.querySelector('[data-booking-list]');
  const result = await authFetch('/api/test-bookings/mine');

  if (!result.ok) {
    list.innerHTML = `<p class="hosp-empty">${result.message}</p>`;
    return;
  }

  if (result.data.length === 0) {
    list.innerHTML = '<p class="hosp-empty">No test bookings yet.</p>';
    return;
  }

  list.innerHTML = '';
  result.data.forEach((booking) => list.appendChild(buildBookingCard(booking)));
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'lab',
    onReady: () => loadBookings()
  });
});