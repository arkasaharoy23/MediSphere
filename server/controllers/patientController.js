const Patient = require('../models/Patient');
const { encrypt, decrypt } = require('../utils/helpers');
const { success, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

async function getProfile(req, res) {
  const record = await Patient.findOne({ userId: req.user.id });

  if (!record) {
    return success(res, null);
  }

  return success(res, {
    fullName: record.fullName,
    dateOfBirth: record.dateOfBirth,
    gender: record.gender,
    bloodGroup: record.bloodGroup,
    address: record.address,
    emergencyContactName: record.emergencyContactName,
    emergencyContactPhone: record.emergencyContactPhoneEncrypted
      ? decrypt(record.emergencyContactPhoneEncrypted)
      : ''
  });
}

async function updateProfile(req, res) {
  const { fullName, dateOfBirth, gender, bloodGroup, address, emergencyContactName, emergencyContactPhone } = req.body;

  if (!fullName || !dateOfBirth || !gender) {
    return fail(res, 'Full name, date of birth, and gender are required');
  }

  const update = {
    userId: req.user.id,
    fullName,
    dateOfBirth,
    gender,
    bloodGroup: bloodGroup || 'unknown',
    address: address || '',
    emergencyContactName: emergencyContactName || '',
    emergencyContactPhoneEncrypted: emergencyContactPhone ? encrypt(emergencyContactPhone) : null
  };

  await Patient.findOneAndUpdate(
    { userId: req.user.id },
    update,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return success(res, { message: 'Profile updated' });
}

module.exports = { getProfile: asyncHandler(getProfile), updateProfile: asyncHandler(updateProfile) };