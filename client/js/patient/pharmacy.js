import { initDashboard } from '../utils/dashboardAuth.js';
import { authFetch } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

let currentLocation = null;
let currentMedicines = [];

function detectLocationAndLoad() {
  if (!navigator.geolocation) {
    currentLocation = null;
    loadPharmacies();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
      loadPharmacies();
    },
    () => {
      currentLocation = null;
      loadPharmacies();
    }
  );
}

async function loadPharmacies() {
  const select = document.querySelector('[data-pharmacy-select]');
  const noteEl = document.querySelector('[data-location-note]');

  const params = new URLSearchParams();
  if (currentLocation) {
    params.set('lat', currentLocation.lat);
    params.set('lng', currentLocation.lng);
  }

  const result = await authFetch(`/api/patient/pharmacies?${params.toString()}`);

  if (!result.ok) {
    select.innerHTML = '<option value="">Could not load pharmacies</option>';
    return;
  }

  const { pharmacies, locationSorted } = result.data;

  if (pharmacies.length === 0) {
    select.innerHTML = '<option value="">No pharmacies available yet</option>';
  } else {
    select.innerHTML = '<option value="">Choose a pharmacy</option>';
    pharmacies.forEach((pharmacy) => {
      const option = document.createElement('option');
      option.value = pharmacy.pharmacyId;
      option.textContent = pharmacy.city ? `${pharmacy.pharmacyName} (${pharmacy.city})` : pharmacy.pharmacyName;
      select.appendChild(option);
    });
  }

  if (noteEl) {
    noteEl.textContent = locationSorted
      ? 'Sorted by distance from your location.'
      : 'Location not shared — showing every verified pharmacy.';
  }
}

function updateOrderTotal() {
  let total = 0;
  let needsPrescription = false;

  document.querySelectorAll('[data-qty-input]').forEach((input) => {
    const qty = Number(input.value) || 0;
    if (qty > 0) {
      const price = Number(input.dataset.price);
      const requiresRx = input.dataset.requiresRx === 'true';
      total += price * qty;
      if (requiresRx) needsPrescription = true;
    }
  });

  document.querySelector('[data-order-total]').textContent = total > 0 ? `Total: ₹${total}` : '';
  document.querySelector('[data-prescription-field]').hidden = !needsPrescription;
}

function buildMedicineCard(med) {
  const card = document.createElement('div');
  card.className = 'hosp-card';

  card.innerHTML = `
    <div class="hosp-card__info">
      <h3>${med.name}${med.requiresPrescription ? '<span class="rx-badge">Rx</span>' : ''}</h3>
      ${med.description ? `<p>${med.description}</p>` : ''}
      <p>₹${med.price} · ${med.stock} in stock</p>
    </div>
    <div class="hosp-card__meta">
      <input type="number" min="0" max="${med.stock}" value="0" class="stock-input"
        data-qty-input data-price="${med.price}" data-requires-rx="${med.requiresPrescription}">
    </div>
  `;

  card.querySelector('[data-qty-input]').addEventListener('input', updateOrderTotal);

  return card;
}

async function loadMedicinesForPharmacy(pharmacyId) {
  const section = document.querySelector('[data-medicine-section]');
  const list = document.querySelector('[data-medicine-list]');

  if (!pharmacyId) {
    section.hidden = true;
    return;
  }

  list.innerHTML = '<p class="hosp-empty">Loading...</p>';
  section.hidden = false;

  const result = await authFetch(`/api/patient/pharmacies/${pharmacyId}/medicines`);

  if (!result.ok || result.data.length === 0) {
    list.innerHTML = '<p class="hosp-empty">No medicines available from this pharmacy right now.</p>';
    currentMedicines = [];
    return;
  }

  currentMedicines = result.data;
  list.innerHTML = '';
  result.data.forEach((med) => list.appendChild(buildMedicineCard(med)));
  updateOrderTotal();
}

function initPharmacySelect() {
  const select = document.querySelector('[data-pharmacy-select]');
  select.addEventListener('change', () => loadMedicinesForPharmacy(select.value));
}

function initPrescriptionField() {
  const input = document.querySelector('#prescriptionImage');
  const label = document.querySelector('[data-prescription-label]');
  const text = document.querySelector('[data-prescription-text]');

  input.addEventListener('change', () => {
    if (input.files.length) {
      text.textContent = input.files[0].name;
      label.setAttribute('data-filled', 'true');
    }
  });
}

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

function buildOrderCard(order) {
  const card = document.createElement('div');
  card.className = 'appt-card';

  const dateLabel = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const canCancel = order.status === 'pending';
  const itemsText = order.items.map((item) => `${item.quantity} × ${item.medicineName}`).join(', ');

  card.innerHTML = `
    <div class="appt-card__info">
      <h3>${order.pharmacyName}</h3>
      <p>${itemsText}</p>
      <p>₹${order.totalAmount} · ${dateLabel}</p>
    </div>
    <div class="appt-card__meta">
      <span class="${statusBadgeClass(order.status)}">${statusLabel(order.status)}</span>
      ${canCancel ? '<button type="button" class="btn btn--ghost btn--sm" data-cancel-btn>Cancel</button>' : ''}
    </div>
  `;

  const cancelBtn = card.querySelector('[data-cancel-btn]');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', async () => {
      if (!window.confirm('Cancel this order?')) return;
      const result = await authFetch(`/api/orders/${order.id}/cancel`, { method: 'PUT' });
      if (!result.ok) return showToast(result.message);
      showToast('Order cancelled', 'success');
      loadOrders();
    });
  }

  return card;
}

async function loadOrders() {
  const list = document.querySelector('[data-order-list]');
  const result = await authFetch('/api/orders/mine');

  if (!result.ok) {
    list.innerHTML = `<p class="appt-empty">${result.message}</p>`;
    return;
  }

  if (result.data.length === 0) {
    list.innerHTML = '<p class="appt-empty">No orders yet.</p>';
    return;
  }

  list.innerHTML = '';
  result.data.forEach((order) => list.appendChild(buildOrderCard(order)));
}

function initOrderForm() {
  const form = document.querySelector('[data-order-form]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const pharmacyId = document.querySelector('[data-pharmacy-select]').value;
    if (!pharmacyId) return showToast('Please choose a pharmacy');

    const items = [];
    document.querySelectorAll('[data-qty-input]').forEach((input, index) => {
      const qty = Number(input.value) || 0;
      if (qty > 0) {
        items.push({ medicineId: currentMedicines[index]._id, quantity: qty });
      }
    });

    if (items.length === 0) return showToast('Select at least one medicine');
    if (!form.deliveryAddress.value.trim()) return showToast('Please enter a delivery address');

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Placing order...';

    const formData = new FormData();
    formData.append('pharmacyId', pharmacyId);
    formData.append('deliveryAddress', form.deliveryAddress.value);
    formData.append('items', JSON.stringify(items));

    const prescriptionInput = document.querySelector('#prescriptionImage');
    if (prescriptionInput.files.length) {
      formData.append('prescriptionImage', prescriptionInput.files[0]);
    }

    const result = await authFetch('/api/orders', {
      method: 'POST',
      body: formData
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Place order';

    if (!result.ok) {
      showToast(result.message);
      return;
    }

    showToast('Order placed', 'success');
    form.reset();
    document.querySelector('[data-medicine-section]').hidden = true;
    document.querySelector('[data-pharmacy-select]').value = '';
    loadOrders();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard({
    expectedRole: 'patient',
    onReady: () => {
      detectLocationAndLoad();
      initPharmacySelect();
      initPrescriptionField();
      initOrderForm();
      loadOrders();
    }
  });
});