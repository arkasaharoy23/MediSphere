const EmergencyRequest = require('../models/EmergencyRequest');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { decrypt } = require('../utils/helpers');
const { success, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

async function triggerSOS(req, res) {
  const { lat, lng } = req.body;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return fail(res, 'A valid location is required to trigger SOS');
  }

  const existingActive = await EmergencyRequest.findOne({ patientId: req.user.id, status: 'active' });
  if (existingActive) {
    return fail(res, 'You already have an active SOS request', 409);
  }

  const profile = await Patient.findOne({ userId: req.user.id });

  const request = await EmergencyRequest.create({
    patientId: req.user.id,
    location: { lat, lng },
    bloodGroup: profile?.bloodGroup || 'unknown',
    emergencyContactName: profile?.emergencyContactName || '',
    emergencyContactPhoneEncrypted: profile?.emergencyContactPhoneEncrypted || null
  });

  return success(res, { id: request._id, status: request.status }, 201);
}

async function listMine(req, res) {
  const requests = await EmergencyRequest.find({ patientId: req.user.id }).sort({ createdAt: -1 });

  const results = requests.map((r) => ({
    id: r._id,
    location: r.location,
    status: r.status,
    bloodGroup: r.bloodGroup,
    emergencyContactName: r.emergencyContactName,
    emergencyContactPhone: r.emergencyContactPhoneEncrypted ? decrypt(r.emergencyContactPhoneEncrypted) : '',
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt
  }));

  return success(res, results);
}

async function cancelSOS(req, res) {
  const { id } = req.params;

  const request = await EmergencyRequest.findById(id);
  if (!request) {
    return fail(res, 'Request not found', 404);
  }

  if (request.patientId.toString() !== req.user.id.toString()) {
    return fail(res, 'You do not have access to this request', 403);
  }

  if (request.status !== 'active') {
    return fail(res, 'This request is no longer active');
  }

  request.status = 'cancelled';
  request.resolvedAt = new Date();
  await request.save();

  return success(res, { id: request._id, status: request.status });
}

async function listActive(req, res) {
  const requests = await EmergencyRequest.find({ status: 'active' }).sort({ createdAt: 1 });

  const results = await Promise.all(
    requests.map(async (r) => {
      const patientUser = await User.findById(r.patientId);
      return {
        id: r._id,
        location: r.location,
        bloodGroup: r.bloodGroup,
        emergencyContactName: r.emergencyContactName,
        emergencyContactPhone: r.emergencyContactPhoneEncrypted ? decrypt(r.emergencyContactPhoneEncrypted) : '',
        patientEmail: patientUser?.email,
        createdAt: r.createdAt
      };
    })
  );

  return success(res, results);
}

module.exports = {
  triggerSOS: asyncHandler(triggerSOS),
  listMine: asyncHandler(listMine),
  cancelSOS: asyncHandler(cancelSOS),
  listActive: asyncHandler(listActive)
};