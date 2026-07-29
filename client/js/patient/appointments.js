import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

let currentLocation = null;

async function loadDoctors(radiusKm) {
  const select = document.querySelector('[data-doctor-select]');
  const noteEl = document.querySelector('[data-location-note]');

  const params = new URLSearchParams();
  if (currentLocation) {
    params.set('lat', currentLocation.lat);
    params.set('lng', currentLocation.lng);
    params.set('maxDistanceKm', radiusKm || 25);
  }

  const result = await authFetch(`/api/patient/doctors?${params.toString()}`);

  if (!result.ok) {
    select.innerHTML = '<option value="">Could not load doctors</option>';
    return;
  }

  const { doctors, locationFiltered } = result.data;

  if (doctors.length === 0) {
    select.innerHTML = `<option value="">No doctors found ${locationFiltered ? 'in this radius' : 'yet'}</option>`;
  } else {
    select.innerHTML = '<option value="">Choose a doctor</option>';
    doctors.forEach((doctor) => {
      const option = document.createElement('option');
      option.value = doctor.doctorId;
      option.textContent = doctor.city
        ? `${doctor.fullName} — ${doctor.specialization} (${doctor.city})`
        : doctor.fullName;
      select.appendChild(option);
    });
  }

  if (noteEl) {
    noteEl.textContent = locationFiltered
      ? 'Showing doctors within your selected radius.'
      : 'Location not shared — showing every verified doctor.';
  }
}

function detectLocationAndLoad(radiusKm) {
  if (!navigator.geolocation) {
    currentLocation = null;
    loadDoctors(radiusKm);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
      loadDoctors(radiusKm);
    },
    () => {
      currentLocation = null;
      loadDoctors(radiusKm);
    }
  );
}

function initRadiusSelect() {
  const radiusSelect = document.querySelector('[data-radius-select]');
  if (!radiusSelect) return;

  radiusSelect.addEventListener('change', () => {
    if (radiusSelect.value === 'all') {
      currentLocation = null;
      loadDoctors();
    } else if (currentLocation) {
      loadDoctors(radiusSelect.value);
    } else {
      detectLocationAndLoad(radiusSelect.value);
    }
  });
}

function statusBadgeClass(status) {
  return `status-badge status-badge--${status}`;
}

function buildApptCard(appt) {
  const card = document.createElement('div');
  card.className = 'appt-card';

  const dateLabel = new Date(appt.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const canCancel = appt.status === 'pending' || appt.status === 'confirmed';

  card.innerHTML = `
    <div class="appt-card__info">
      <h3>${appt.doctorName}${appt.doctorSpecialization ? ' — ' + appt.doctorSpecialization : ''}</h3>
      <p>${dateLabel} at ${appt.timeSlot}${appt.reason ? ' · ' + appt.reason : ''}</p>
    </div>
    <div class="appt-card__meta">
      <span class="${statusBadgeClass(appt.status)}">${appt.status}</span>
      ${canCancel ? '<button type="button" class="btn btn--ghost btn--sm" data-cancel-btn>Cancel</button>' : ''}
    </div>
  `;

  const cancelBtn = card.querySelector('[data-cancel-btn]');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', async () => {
      if (!window.confirm('Cancel this appointment?')) return;

      const result = await authFetch(`/api/appointments/${appt.id}/cancel`, { method: 'PATCH' });

      if (!result.ok) {
        showToast(result.message);
        return;
      }

      showToast('Appointment cancelled', 'success');
      loadAppointments();
    });
  }

  return card;
}

async function loadAppointments() {
  const list = document.querySelector('[data-appt-list]');
  const result = await authFetch('/api/appointments/mine');

  if (!result.ok) {
    list.innerHTML = `<p class="appt-empty">${result.message}</p>`;
    return;
  }

  if (result.data.length === 0) {
    list.innerHTML = '<p class="appt-empty">You have no appointments yet.</p>';
    return;
  }

  list.innerHTML = '';
  result.data.forEach((appt) => list.appendChild(buildApptCard(appt)));
}

function initBookingForm() {
  const form = document.querySelector('[data-booking-form]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const doctorId = form.doctorId.value;
    const date = form.date.value;
    const timeSlot = form.timeSlot.value;
    const reason = form.reason.value;

    if (!doctorId) return showToast('Please choose a doctor');
    if (!date) return showToast('Please choose a date');
    if (!timeSlot) return showToast('Please enter a preferred time');

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Booking...';

    const result = await authFetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId, date, timeSlot, reason })
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Book appointment';

    if (!result.ok) {
      showToast(result.message);
      return;
    }

    showToast('Appointment requested', 'success');
    form.reset();
    loadAppointments();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'patient',
    onReady: () => {
      detectLocationAndLoad(25);
      initRadiusSelect();
      initBookingForm();
      loadAppointments();
    }
  });
});