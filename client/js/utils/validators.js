const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+91)?[6-9]\d{9}$/;
const FAKE_PHONE_PATTERNS = [
  /^(\+91)?(\d)\2{9}$/,
  /^(\+91)?0123456789$/,
  /^(\+91)?1234567890$/,
  /^(\+91)?9876543210$/
];

function isValidEmail(value) {
  return EMAIL_REGEX.test(value.trim());
}

function isValidIndianPhone(value) {
  const trimmed = value.trim();
  if (!PHONE_REGEX.test(trimmed)) return false;
  return !FAKE_PHONE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function isStrongEnoughPassword(value) {
  return value.length >= 8;
}

function isFileSelected(inputEl) {
  return inputEl && inputEl.files && inputEl.files.length > 0;
}

export { isValidEmail, isValidIndianPhone, isStrongEnoughPassword, isFileSelected };