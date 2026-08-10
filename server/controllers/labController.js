const Lab = require('../models/Lab');
const LabTest = require('../models/LabTest');
const TestBooking = require('../models/TestBooking');
const { decrypt } = require('../utils/helpers');
const { getSignedViewUrl } = require('../services/cloudinaryService');
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

module.exports = {
  getProfile: asyncHandler(getProfile),
  updateProfile: asyncHandler(updateProfile),
  listMyTests: asyncHandler(listMyTests),
  addTest: asyncHandler(addTest),
  updateTest: asyncHandler(updateTest),
  deleteTest: asyncHandler(deleteTest)
};