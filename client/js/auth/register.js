import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { auth } from '../config/firebase.js';
import { signInWithGoogle } from './googleAuth.js';
import { isValidEmail, isValidIndianPhone, isStrongEnoughPassword, isFileSelected } from '../utils/validators.js';
import { showToast } from '../components/toast.js';
import { initTheme } from '../utils/theme.js';
import { API_BASE_URL } from '../config/api.js';
import { initPasswordToggles } from '../components/passwordToggle.js';
import { SPECIALIZATIONS, DEGREES } from '../utils/medicalOptions.js';

const ROLE_FIELDS = {
  patient: [],
  doctor: [
    { name: 'fullName', label: 'Full name', type: 'text', required: true },
    { name: 'specialization', label: 'Specialization', type: 'select', options: SPECIALIZATIONS, required: true },
    { name: 'degree', label: 'Medical degree', type: 'select', options: DEGREES, required: true },
    { name: 'degreeCertificate', label: 'Degree certificate', type: 'file', required: true, accept: 'image/jpeg', acceptLabel: 'JPG only' },
    { name: 'registrationNumber', label: 'State medical council registration number', type: 'text', required: true },
    { name: 'registrationCertificate', label: 'Registration certificate', type: 'file', required: true, accept: 'image/jpeg', acceptLabel: 'JPG only' },
    { name: 'city', label: 'City of practice', type: 'text', required: true },
    { name: 'location', label: 'Practice location', type: 'location', required: true }
  ],
  hospital: [
    { name: 'hospitalName', label: 'Hospital name', type: 'text', required: true },
    { name: 'address', label: 'Address', type: 'text', required: true },
    { name: 'licenseNumber', label: 'Clinical Establishment license number', type: 'text', required: true },
    { name: 'document1', label: 'Verification document 1', type: 'file', required: true },
    { name: 'document2', label: 'Verification document 2', type: 'file', required: true },
    { name: 'city', label: 'City', type: 'text', required: true },
    { name: 'location', label: 'Hospital location', type: 'location', required: true }
  ],
  lab: [
    { name: 'labName', label: 'Lab name', type: 'text', required: true },
    { name: 'licenseNumber', label: 'Lab license number', type: 'text', required: true },
    { name: 'document', label: 'Verification document', type: 'file', required: true }
  ],
  pharmacy: [
    { name: 'pharmacyName', label: 'Pharmacy name', type: 'text', required: true },
    { name: 'drugLicenseNumber', label: 'Drug license number (Form 20/21)', type: 'text', required: true },
    { name: 'document', label: 'Verification document', type: 'file', required: true }
  ],
  ambulance: [
    { name: 'vehicleNumber', label: 'Vehicle registration number', type: 'text', required: true },
    { name: 'rcDocument', label: 'Vehicle RC document', type: 'file', required: true },
    { name: 'driverName', label: "Driver's full name", type: 'text', required: true },
    { name: 'driverLicenseNumber', label: "Driver's license number", type: 'text', required: true },
    { name: 'driverLicenseDoc', label: "Driver's license document", type: 'file', required: true },
    { name: 'driverPhoto', label: "Driver's photo", type: 'file', required: true },
    { name: 'driverIdDoc', label: "Driver's ID document", type: 'file', required: true },
    { name: 'permitDocument', label: 'Ambulance operating permit', type: 'file', required: true },
    { name: 'city', label: 'Base city', type: 'text', required: true },
    { name: 'location', label: 'Base location', type: 'location', required: true }
  ]
};

const state = {
  role: null,
  firebaseUser: null
};

function goToStep(stepNumber) {
  document.querySelectorAll('.auth-step').forEach((el) => {
    el.setAttribute('data-active', String(Number(el.dataset.step) === stepNumber));
  });
  document.querySelectorAll('.stepper-dots span').forEach((el, index) => {
    el.setAttribute('data-active', String(index < stepNumber));
  });
}

function buildFileField(field, onValid) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-field';

  const label = document.createElement('label');
  label.textContent = field.label;
  wrapper.appendChild(label);

  const fileLabel = document.createElement('label');
  fileLabel.className = 'form-file';

  const icon = document.createElement('span');
  icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke-linejoin="round"/><path d="M14 2V8H20" stroke-linejoin="round"/></svg>';

  const accept = field.accept || 'image/jpeg,image/png,image/webp,application/pdf';
  const acceptLabel = field.acceptLabel || 'JPG, PNG, or PDF';

  const textSpan = document.createElement('span');
  textSpan.textContent = `Choose a file (${acceptLabel})`;

  const input = document.createElement('input');
  input.type = 'file';
  input.name = field.name;
  input.accept = accept;
  if (field.required) input.required = true;

  let triggered = false;

  input.addEventListener('change', () => {
    if (!isFileSelected(input)) return;

    const file = input.files[0];
    const allowedTypes = accept.split(',');
    if (!allowedTypes.includes(file.type)) {
      input.value = '';
      fileLabel.removeAttribute('data-filled');
      textSpan.textContent = `Choose a file (${acceptLabel})`;
      showToast(`${field.label} must be a ${acceptLabel} file`);
      return;
    }

    textSpan.textContent = file.name;
    fileLabel.setAttribute('data-filled', 'true');

    if (!triggered) {
      triggered = true;
      onValid?.();
    }
  });

  fileLabel.appendChild(icon);
  fileLabel.appendChild(textSpan);
  fileLabel.appendChild(input);
  wrapper.appendChild(fileLabel);

  return wrapper;
}

function buildSelectField(field, onValid) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-field';

  const label = document.createElement('label');
  label.textContent = field.label;
  label.setAttribute('for', field.name);
  wrapper.appendChild(label);

  const select = document.createElement('select');
  select.id = field.name;
  select.name = field.name;
  if (field.required) select.required = true;

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = `Select ${field.label.toLowerCase()}`;
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);

  field.options.forEach((optionValue) => {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionValue;
    select.appendChild(option);
  });

  let triggered = false;
  select.addEventListener('change', () => {
    if (select.value && !triggered) {
      triggered = true;
      onValid?.();
    }
  });

  wrapper.appendChild(select);
  return wrapper;
}

function buildTextField(field, onValid) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-field';

  const label = document.createElement('label');
  label.textContent = field.label;
  label.setAttribute('for', field.name);
  wrapper.appendChild(label);

  const input = document.createElement('input');
  input.type = 'text';
  input.id = field.name;
  input.name = field.name;
  if (field.required) input.required = true;

  let triggered = false;
  input.addEventListener('input', () => {
    if (input.value.trim() && !triggered) {
      triggered = true;
      onValid?.();
    }
  });

  wrapper.appendChild(input);
  return wrapper;
}

function buildLocationField(field, onValid) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-field';

  const label = document.createElement('label');
  label.textContent = field.label;
  wrapper.appendChild(label);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn--ghost btn--sm';
  button.textContent = 'Detect my location';

  const statusText = document.createElement('small');
  statusText.textContent = 'Required — used to show you to nearby patients.';

  const latInput = document.createElement('input');
  latInput.type = 'hidden';
  latInput.name = 'lat';

  const lngInput = document.createElement('input');
  lngInput.type = 'hidden';
  lngInput.name = 'lng';

  let triggered = false;

  button.addEventListener('click', () => {
    if (!navigator.geolocation) {
      statusText.textContent = 'Your browser does not support location detection.';
      return;
    }

    button.disabled = true;
    button.textContent = 'Detecting...';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        latInput.value = position.coords.latitude;
        lngInput.value = position.coords.longitude;
        statusText.textContent = `Location captured (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`;
        button.disabled = false;
        button.textContent = 'Re-detect location';

        if (!triggered) {
          triggered = true;
          onValid?.();
        }
      },
      () => {
        statusText.textContent = 'Could not get your location. Please allow location access and try again.';
        button.disabled = false;
        button.textContent = 'Detect my location';
      }
    );
  });

  wrapper.appendChild(button);
  wrapper.appendChild(statusText);
  wrapper.appendChild(latInput);
  wrapper.appendChild(lngInput);
  return wrapper;
}

function renderRoleFields(role) {
  const container = document.querySelector('[data-role-fields]');
  const submitBtn = document.querySelector('[data-details-form] [type="submit"]');
  container.innerHTML = '';

  const fields = ROLE_FIELDS[role];
  if (submitBtn) submitBtn.disabled = fields.length > 0;

  renderNextField(container, fields, 0);
}

function renderNextField(container, fields, index) {
  if (index >= fields.length) {
    const submitBtn = document.querySelector('[data-details-form] [type="submit"]');
    if (submitBtn) submitBtn.disabled = false;
    return;
  }

  const field = fields[index];
  const onValid = () => renderNextField(container, fields, index + 1);

  let node;
  if (field.type === 'file') node = buildFileField(field, onValid);
  else if (field.type === 'location') node = buildLocationField(field, onValid);
  else if (field.type === 'select') node = buildSelectField(field, onValid);
  else node = buildTextField(field, onValid);

  node.classList.add('form-field--reveal');
  container.appendChild(node);

  const focusable = node.querySelector('input:not([type="hidden"]), select');
  focusable?.focus();
}

function initRoleSelect() {
  const options = document.querySelectorAll('.role-option');
  const continueBtn = document.querySelector('[data-role-continue]');

  options.forEach((option) => {
    option.addEventListener('click', () => {
      options.forEach((el) => el.setAttribute('data-selected', 'false'));
      option.setAttribute('data-selected', 'true');
      state.role = option.dataset.role;
      continueBtn.disabled = false;
    });
  });

  continueBtn.addEventListener('click', () => {
    if (!state.role) return;
    renderRoleFields(state.role);
    goToStep(2);
  });
}

async function handleAccountCreated(user) {
  state.firebaseUser = user;
  goToStep(3);
}

function initAccountStep() {
  const form = document.querySelector('[data-account-form]');
  const googleBtn = document.querySelector('[data-google-btn]');
  const phoneInput = document.querySelector('[data-phone-input]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = form.email.value;
    const password = form.password.value;
    const phone = phoneInput.value;

    if (!isValidEmail(email)) return showToast('Enter a valid email address');
    if (!isValidIndianPhone(phone)) return showToast('Enter a valid 10-digit Indian mobile number');
    if (!isStrongEnoughPassword(password)) return showToast('Password must be at least 8 characters');

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      handleAccountCreated(credential.user);
    } catch (err) {
      showToast(err.message.replace('Firebase: ', ''));
    }
  });

  googleBtn.addEventListener('click', async () => {
    const phone = phoneInput.value;
    if (!isValidIndianPhone(phone)) return showToast('Enter a valid 10-digit Indian mobile number before continuing');

    try {
      const user = await signInWithGoogle();
      handleAccountCreated(user);
    } catch (err) {
      showToast(err.message.replace('Firebase: ', ''));
    }
  });
}

function initSubmitStep() {
  const form = document.querySelector('[data-details-form]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!state.firebaseUser) return showToast('Please complete account creation first');

    if (['doctor', 'hospital', 'ambulance'].includes(state.role)) {
      const latInput = form.querySelector('input[name="lat"]');
      if (!latInput || !latInput.value) {
        return showToast('Please detect your location before submitting');
      }
    }

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      const idToken = await state.firebaseUser.getIdToken();
      const formData = new FormData(form);
      formData.append('idToken', idToken);
      formData.append('role', state.role);
      formData.append('phone', document.querySelector('[data-phone-input]').value);

      const profilePicInput = document.querySelector('[data-profile-pic-input]');
      if (isFileSelected(profilePicInput)) {
        formData.append('profilePic', profilePicInput.files[0]);
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!result.ok) {
        showToast(result.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create account';
        return;
      }

      showToast('Account created', 'success');
      window.location.href = `../${state.role}/dashboard.html`;
    } catch (err) {
      showToast('Something went wrong, please try again');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create account';
    }
  });
}

function initProfilePicField() {
  const input = document.querySelector('[data-profile-pic-input]');
  const label = document.querySelector('[data-profile-pic-label]');

  input.addEventListener('change', () => {
    if (isFileSelected(input)) {
      label.textContent = input.files[0].name;
      input.closest('.form-file').setAttribute('data-filled', 'true');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initPasswordToggles();
  initRoleSelect();
  initAccountStep();
  initSubmitStep();
  initProfilePicField();
});