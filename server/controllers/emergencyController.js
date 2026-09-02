const EmergencyRequest = require('../models/EmergencyRequest');
const Patient = require('../models/Patient');
const User = require('../models/User');
const Ambulance = require('../models/Ambulance');
const Hospital = require('../models/Hospital');
const { decrypt } = require('../utils/helpers');
const { success, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

async function findNearestAmbulance(lat, lng) {
  const verifiedAmbulanceUsers = await User.find({ role: 'ambulance', verificationStatus: 'verified' });
  const verifiedIds = verifiedAmbulanceUsers.map((u) => u._id);

  const nearest = await Ambulance.findOne({
    userId: { $in: verifiedIds },
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] }
      }
    }
  });

  return nearest ? nearest.userId : null;
}

async function findNearestHospital(lat, lng) {
  const verifiedHospitalUsers = await User.find({ role: 'hospital', verificationStatus: 'verified' });
  const verifiedIds = verifiedHospitalUsers.map((u) => u._id);

  const nearest = await Hospital.findOne({
    userId: { $in: verifiedIds },
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] }
      }
    }
  });

  return nearest ? nearest.userId : null;
}

async function triggerSOS(req, res) {
  const { lat, lng, hospitalId } = req.body;

  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return fail(res, 'A valid location is required to trigger SOS');
  }

  const existingActive = await EmergencyRequest.findOne({ patientId: req.user.id, status: 'active' });
  if (existingActive) {
    return fail(res, 'You already have an active SOS request', 409);
  }

  const profile = await Patient.findOne({ userId: req.user.id });

  let resolvedHospitalId = null;
  if (hospitalId) {
    const chosenHospital = await User.findOne({ _id: hospitalId, role: 'hospital', verificationStatus: 'verified' });
    if (chosenHospital) resolvedHospitalId = chosenHospital._id;
  }
  if (!resolvedHospitalId) {
    resolvedHospitalId = await findNearestHospital(lat, lng);
  }

  const resolvedAmbulanceId = await findNearestAmbulance(lat, lng);

  let request;

  try {
    request = await EmergencyRequest.create({
      patientId: req.user.id,
      location: { lat, lng },
      bloodGroup: profile?.bloodGroup || 'unknown',
        emergencyContactName:
      profile?.emergencyContactName || '',
        emergencyContactPhoneEncrypted:
      profile?.emergencyContactPhoneEncrypted || null,
      ambulanceId: resolvedAmbulanceId,
      hospitalId: resolvedHospitalId
  });
  } catch (err) {
    if (err.code === 11000) {
      return fail(
        res,
        'You already have an active SOS request',409
      );
    }

  throw err;
}

  return success(res, {
    id: request._id,
    status: request.status,
    ambulanceAssigned: !!resolvedAmbulanceId,
    hospitalAssigned: !!resolvedHospitalId
  }, 201);
}

async function enrichRequest(r, includeEmergencyPhone = false) {
  const [ambulanceRecord, hospitalRecord] = await Promise.all([
    r.ambulanceId ? Ambulance.findOne({ userId: r.ambulanceId }) : null,
    r.hospitalId ? Hospital.findOne({ userId: r.hospitalId }) : null
  ]);

  const result = {
    id: r._id,
    location: r.location,
    status: r.status,
    bloodGroup: r.bloodGroup,
    emergencyContactName: r.emergencyContactName,
    ambulance: ambulanceRecord? {
        vehicleNumber: ambulanceRecord.vehicleNumber,
        driverName: ambulanceRecord.driverName,
        city: ambulanceRecord.city
      }: null,
    hospital: hospitalRecord? {
        hospitalName: hospitalRecord.hospitalName,
        address: hospitalRecord.address
      }: null,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt
  };

  if (includeEmergencyPhone) {
    result.emergencyContactPhone = r.emergencyContactPhoneEncrypted? decrypt(r.emergencyContactPhoneEncrypted): '';
  }
  return result;
}

async function listMine(req, res) {
  const requests = await EmergencyRequest.find({ patientId: req.user.id }).sort({ createdAt: -1 });
  const results = await Promise.all(requests.map(enrichRequest));
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
      const base = await enrichRequest(r, false);
      return { ...base, patientEmail: patientUser?.email };
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