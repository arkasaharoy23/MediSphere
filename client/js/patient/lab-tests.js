import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

let currentLocation = null;

function detectLocationAndLoad() {
  if (!navigator.geolocation) {
    currentLocation = null;
    loadLabs();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
      loadLabs();
    },
    () => {
      currentLocation = null;
      loadLabs();
    }
  );
}

async function loadLabs() {
  const select = document.querySelector('[data-lab-select]');
  const noteEl = document.querySelector('[data-location-note]');

  const params = new URLSearchParams();
  if (currentLocation) {
    params.set('lat', currentLocation.lat);
    params.set('lng', currentLocation.lng);
  }

  const result = await authFetch(`/api/patient/labs?${params.toString()}`);

  if (!result.ok) {
    select.innerHTML = '<option value="">Could not load labs</option>';
    return;
  }

  const { labs, locationSorted } = result.data;

  if (labs.length === 0) {
    select.innerHTML = '<option value="">No labs available yet</option>';
  } else {
    select.innerHTML = '<option value="">Choose a lab</option>';
    labs.forEach((lab) => {
      const option = document.createElement('option');
      option.value = lab.labId;
      option.textContent = lab.city ? `${lab.labName} (${lab.city})` : lab.labName;
      select.appendChild(option);
    });
  }

  if (noteEl) {
    noteEl.textContent = locationSorted
      ? 'Sorted by distance from your location.'
      : 'Location not shared — showing every verified lab.';
  }
}

async function loadTestsForLab(labId) {
  const select = document.querySelector('[data-test-select]');

  if (!labId) {
    select.innerHTML = '<option value="">Choose a lab first</option>';
    return;
  }

  select.innerHTML = '<option value="">Loading tests...</option>';

  const result = await authFetch(`/api/patient/labs/${labId}/tests`);

  if (!result.ok || result.data.length === 0) {
    select.innerHTML = '<option value="">No tests listed by this lab yet</option>';
    return;
  }

  select.innerHTML = '<option value="">Choose a test</option>';
  result.data.forEach((test) => {
    const option = document.createElement('option');
    option.value = test._id;
    option.textContent = `${test.name} — ₹${test.price} (${test.turnaroundDays} day${test.turnaroundDays === 1 ? '' : 's'})`;
    select.appendChild(option);
  });
}

function initLabSelect() {
  const select = document.querySelector('[data-lab-select]');
  select.addEventListener('change', () => loadTestsForLab(select.value));
}

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

function buildBookingCard(booking) {
  const card = document.createElement('div');
  card.className = 'appt-card';

  const dateLabel = new Date(booking.preferredDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const canCancel = booking.status === 'pending';

  card.innerHTML = `
    <div class="appt-card__info">
      <h3>${booking.testName}</h3>
      <p>${booking.labName} · ₹${booking.price} · Preferred: ${dateLabel}</p>
    </div>
    <div class="appt-card__meta">
      <span class="${statusBadgeClass(booking.status)}">${statusLabel(booking.status)}</span>
      ${booking.reportViewUrl ? `<a href="${booking.reportViewUrl}" target="_blank" rel="noopener" class="btn btn--ghost btn--sm">View report</a>` : ''}
      ${canCancel ? '<button type="button" class="btn btn--ghost btn--sm" data-cancel-btn>Cancel</button>' : ''}
    </div>
  `;

  const cancelBtn = card.querySelector('[data-cancel-btn]');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', async () => {
      if (!window.confirm('Cancel this test booking?')) return;
      const result = await authFetch(`/api/test-bookings/${booking.id}/cancel`, { method: 'PUT' });
      if (!result.ok) return showToast(result.message);
      showToast('Booking cancelled', 'success');
      loadBookings();
    });
  }

  return card;
}

async function loadBookings() {
  const list = document.querySelector('[data-booking-list]');
  const result = await authFetch('/api/test-bookings/mine');

  if (!result.ok) {
    list.innerHTML = `<p class="appt-empty">${result.message}</p>`;
    return;
  }

  if (result.data.length === 0) {
    list.innerHTML = '<p class="appt-empty">No test bookings yet.</p>';
    return;
  }

  list.innerHTML = '';
  result.data.forEach((booking) => list.appendChild(buildBookingCard(booking)));
}

function initBookingForm() {
  const form = document.querySelector('[data-booking-form]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const labId = form.labId.value;
    const testId = form.testId.value;
    const preferredDate = form.preferredDate.value;

    if (!labId) return showToast('Please choose a lab');
    if (!testId) return showToast('Please choose a test');
    if (!preferredDate) return showToast('Please choose a preferred date');

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Booking...';

    const result = await authFetch('/api/test-bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labId, testId, preferredDate })
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Book test';

    if (!result.ok) {
      showToast(result.message);
      return;
    }

    showToast('Test booked', 'success');
    form.reset();
    document.querySelector('[data-test-select]').innerHTML = '<option value="">Choose a lab first</option>';
    loadBookings();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'patient',
    onReady: () => {
      detectLocationAndLoad();
      initLabSelect();
      initBookingForm();
      loadBookings();
    }
  });
});