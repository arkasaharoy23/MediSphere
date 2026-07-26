const PHONE_REGEX = /^(\+91)?[6-9]\d{9}$/;
const FAKE_PATTERNS = [
  /^(\+91)?(\d)\2{9}$/,
  /^(\+91)?0123456789$/,
  /^(\+91)?1234567890$/,
  /^(\+91)?9876543210$/
];

function isValidIndianPhone(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!PHONE_REGEX.test(trimmed)) return false;
  return !FAKE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function normalizePhone(value) {
  const trimmed = value.trim();
  return trimmed.startsWith('+91') ? trimmed : `+91${trimmed}`;
}

module.exports = { isValidIndianPhone, normalizePhone };