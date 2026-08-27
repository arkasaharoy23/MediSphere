const Lab = require('../models/Lab');
const LabTest = require('../models/LabTest');
const User = require('../models/User');
const { decrypt, encrypt, hashForLookup } = require('../utils/helpers');
const { getSignedViewUrl, uploadBuffer } = require('../services/cloudinaryService');
const { success, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

async function getProfile(req, res) {
  const record = await Lab.findOne({ userId: req.user.id });
  if (!record) return success(res, null);

  return success(res, {
    labName: record.labName,
    city: record.city,
    location: record.location,
    licenseNumber: decrypt(record.licenseNumberEncrypted),
    documentViewUrl: getSignedViewUrl(record.documentPublicId)
  });
}

async function updateProfile(req, res) {
  const { labName, city, lat, lng } = req.body;

  if (!labName || !city) {
    return fail(res, 'Lab name and city are required');
  }

  const update = { labName, city };
  if (lat && lng) {
    update.location = { type: 'Point', coordinates: [Number(lng), Number(lat)] };
  }

  const record = await Lab.findOneAndUpdate({ userId: req.user.id }, update, { new: true });
  if (!record) return fail(res, 'Lab profile not found', 404);

  return success(res, { message: 'Profile updated' });
}

async function listMyTests(req, res) {
  const tests = await LabTest.find({ labId: req.user.id }).sort({ name: 1 });
  return success(res, tests);
}

async function addTest(req, res) {
  const { name, description, price, turnaroundDays } = req.body;

  if (!name?.trim() || price == null || turnaroundDays == null) {
    return fail(res, 'Test name, price, and turnaround time are required');
  }
  if (Number(price) < 0 || Number(turnaroundDays) < 0) {
    return fail(res, 'Price and turnaround time cannot be negative');
  }

  const test = await LabTest.create({
    labId: req.user.id,
    name: name.trim(),
    description: description?.trim() || '',
    price: Number(price),
    turnaroundDays: Number(turnaroundDays)
  });

  return success(res, test, 201);
}

async function updateTest(req, res) {
  const { id } = req.params;
  const { name, description, price, turnaroundDays } = req.body;

  if (!name?.trim() || price == null || turnaroundDays == null) {
    return fail(res, 'Test name, price, and turnaround time are required');
  }
  if (Number(price) < 0 || Number(turnaroundDays) < 0) {
    return fail(res, 'Price and turnaround time cannot be negative');
  }

  const test = await LabTest.findOneAndUpdate(
    { _id: id, labId: req.user.id },
    { name: name.trim(), description: description?.trim() || '', price: Number(price), turnaroundDays: Number(turnaroundDays) },
    { new: true }
  );

  if (!test) return fail(res, 'Test not found', 404);

  return success(res, test);
}

async function deleteTest(req, res) {
  const { id } = req.params;

  const test = await LabTest.findOneAndDelete({ _id: id, labId: req.user.id });
  if (!test) return fail(res, 'Test not found', 404);

  return success(res, { message: 'Test removed' });
}

async function resubmitApplication(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) {
    return fail(res, 'Account not found', 404);
  }

  if (user.verificationStatus !== 'rejected') {
    return fail(res, 'Only rejected applications can be resubmitted');
  }

  const { labName, licenseNumber, city, lat, lng } = req.body;
  const doc = req.files?.document?.[0];

  if (!labName || !licenseNumber || !city || !lat || !lng) {
    return fail(res, 'All fields are required to resubmit your application');
  }

  if (!doc) {
    return fail(res, 'Please re-upload your verification document');
  }

  const docUpload = await uploadBuffer(doc.buffer, 'labs');

  try {
    await Lab.findOneAndUpdate(
      { userId: req.user.id },
      {
        labName,
        licenseNumberEncrypted: encrypt(licenseNumber),
        licenseNumberHash: hashForLookup(licenseNumber),
        documentUrl: docUpload.url,
        documentPublicId: docUpload.publicId,
        city,
        location: { type: 'Point', coordinates: [Number(lng), Number(lat)] }
      },
      { runValidators: true }
    );
  } catch (err) {
    if (err.code === 11000) {
      return fail(res, 'This license number is already registered to another account', 409);
    }
    throw err;
  }

  user.verificationStatus = 'pending';
  user.rejectionReason = null;
  await user.save();

  return success(res, { message: 'Application resubmitted for review' });
}

module.exports = {
  getProfile: asyncHandler(getProfile),
  updateProfile: asyncHandler(updateProfile),
  listMyTests: asyncHandler(listMyTests),
  addTest: asyncHandler(addTest),
  updateTest: asyncHandler(updateTest),
  deleteTest: asyncHandler(deleteTest),
  resubmitApplication: asyncHandler(resubmitApplication)
};