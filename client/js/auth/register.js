import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { auth } from '../config/firebase.js';
import { signInWithGoogle } from './googleAuth.js';
import { isValidEmail, isValidIndianPhone, isStrongEnoughPassword, isFileSelected } from '../utils/validators.js';
import { showToast } from '../components/toast.js';
import { initTheme } from '../utils/theme.js';
import { API_BASE_URL } from '../config/api.js';
import { initPasswordToggles } from '../components/passwordToggle.js';

const ROLE_FIELDS = {
  patient: [],
  doctor: [
    { name: 'fullName', label: 'Full name', type: 'text', required: true },
    { name: 'specialization', label: 'Specialization', type: 'text', required: true },
    { name: 'registrationNumber', label: 'State medical council registration number', type: 'text', required: true },
    { name: 'registrationCertificate', label: 'Registration certificate', type: 'file', required: true }
  ],
  hospital: [
    { name: 'hospitalName', label: 'Hospital name', type: 'text', required: true },
    { name: 'address', label: 'Address', type: 'text', required: true },
    { name: 'licenseNumber', label: 'Clinical Establishment license number', type: 'text', required: true },
    { name: 'document1', label: 'Verification document 1', type: 'file', required: true },
    { name: 'document2', label: 'Verification document 2', type: 'file', required: true }
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
    { name: 'permitDocument', label: 'Ambulance operating permit', type: 'file', required: true }
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

function buildFileField(field) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-field';

  const label = document.createElement('label');
  label.textContent = field.label;
  wrapper.appendChild(label);

  const fileLabel = document.createElement('label');
  fileLabel.className = 'form-file';

  const icon = document.createElement('span');
  icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke-linejoin="round"/><path d="M14 2V8H20" stroke-linejoin="round"/></svg>';

  const textSpan = document.createElement('span');
  textSpan.textContent = 'Choose a file (JPG, PNG, or PDF)';

  const input = document.createElement('input');
  input.type = 'file';
  input.name = field.name;
  input.accept = 'image/jpeg,image/png,image/webp,application/pdf';
  if (field.required) input.required = true;

  input.addEventListener('change', () => {
    if (isFileSelected(input)) {
      textSpan.textContent = input.files[0].name;
      fileLabel.setAttribute('data-filled', 'true');
    }
  });

  fileLabel.appendChild(icon);
  fileLabel.appendChild(textSpan);
  fileLabel.appendChild(input);
  wrapper.appendChild(fileLabel);

  return wrapper;
}

function buildTextField(field) {
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

  wrapper.appendChild(input);
  return wrapper;
}

function renderRoleFields(role) {
  const container = document.querySelector('[data-role-fields]');
  container.innerHTML = '';

  ROLE_FIELDS[role].forEach((field) => {
    const node = field.type === 'file' ? buildFileField(field) : buildTextField(field);
    container.appendChild(node);
  });
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