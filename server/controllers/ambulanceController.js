const Ambulance = require('../models/Ambulance');
const EmergencyRequest = require('../models/EmergencyRequest');
const User = require('../models/User');
const { decrypt, encrypt, hashForLookup } = require('../utils/helpers');
const { getSignedViewUrl, uploadBuffer } = require('../services/cloudinaryService');
const { success, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

async function getProfile(req, res) {
  const record = await Ambulance.findOne({ userId: req.user.id });
  if (!record) return success(res, null);

  return success(res, {
    vehicleNumber: record.vehicleNumber,
    driverName: record.driverName,
    city: record.city,
    location: record.location,
    available: record.available,
    driverLicenseNumber: decrypt(record.driverLicenseNumberEncrypted),
    rcDocumentViewUrl: getSignedViewUrl(record.rcDocumentPublicId),
    driverLicenseDocViewUrl: getSignedViewUrl(record.driverLicenseDocPublicId),
    driverPhotoViewUrl: getSignedViewUrl(record.driverPhotoPublicId),
    driverIdDocViewUrl: getSignedViewUrl(record.driverIdDocPublicId),
    permitDocumentViewUrl: getSignedViewUrl(record.permitDocumentPublicId)
  });
}

async function updateProfile(req, res) {
  const { driverName, city, lat, lng, available } = req.body;

  if (!driverName || !city) {
    return fail(res, 'Driver name and city are required');
  }

  const update = { driverName, city };

  if (lat && lng) {
    update.location = { type: 'Point', coordinates: [Number(lng), Number(lat)] };
  }

  if (available !== undefined) {
    update.available = available === true || available === 'true';
  }

  const record = await Ambulance.findOneAndUpdate({ userId: req.user.id }, update, { new: true });
  if (!record) return fail(res, 'Ambulance profile not found', 404);

  return success(res, { message: 'Profile updated' });
}

async function updateLocation(req, res) {
  const { lat, lng } = req.body;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return fail(res, 'A valid lat/lng location is required');
  }

  const record = await Ambulance.findOneAndUpdate(
    { userId: req.user.id },
    {
      currentLocation: { type: 'Point', coordinates: [lng, lat] },
      locationUpdatedAt: new Date()
    },
    { new: true }
  );

  if (!record) return fail(res, 'Ambulance profile not found', 404);

  return success(res, { message: 'Location updated' });
}

async function listAssignedRequests(req, res) {
  const requests = await EmergencyRequest.find({ ambulanceId: req.user.id }).sort({ createdAt: -1 });

  const results = await Promise.all(
    requests.map(async (r) => {
      const patientUser = await User.findById(r.patientId);
      return {
        id: r._id,
        location: r.location,
        status: r.status,
        bloodGroup: r.bloodGroup,
        emergencyContactName: r.emergencyContactName,
        emergencyContactPhone: r.emergencyContactPhoneEncrypted ? decrypt(r.emergencyContactPhoneEncrypted) : '',
        patientEmail: patientUser?.email || 'Unknown patient',
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt
      };
    })
  );

  return success(res, results);
}

async function resolveRequest(req, res) {
  const { id } = req.params;

  const request = await EmergencyRequest.findById(id);
  if (!request) {
    return fail(res, 'Request not found', 404);
  }

  if (!request.ambulanceId || request.ambulanceId.toString() !== req.user.id.toString()) {
    return fail(res, 'You do not have access to this request', 403);
  }

  if (request.status !== 'active') {
    return fail(res, 'This request is no longer active');
  }

  request.status = 'resolved';
  request.resolvedAt = new Date();
  await request.save();

  return success(res, { id: request._id, status: request.status });
}

async function resubmitApplication(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) {
    return fail(res, 'Account not found', 404);
  }

  if (user.verificationStatus !== 'rejected') {
    return fail(res, 'Only rejected applications can be resubmitted');
  }

  const { vehicleNumber, driverName, driverLicenseNumber, city, lat, lng } = req.body;
  const rc = req.files?.rcDocument?.[0];
  const licenseDoc = req.files?.driverLicenseDoc?.[0];
  const photo = req.files?.driverPhoto?.[0];
  const idDoc = req.files?.driverIdDoc?.[0];
  const permit = req.files?.permitDocument?.[0];

  if (!vehicleNumber || !driverName || !driverLicenseNumber || !city || !lat || !lng) {
    return fail(res, 'All fields are required to resubmit your application');
  }

  if (!rc || !licenseDoc || !photo || !idDoc || !permit) {
    return fail(res, 'Please re-upload all five documents');
  }

  const [rcUpload, licenseUpload, photoUpload, idUpload, permitUpload] = await Promise.all([
    uploadBuffer(rc.buffer, 'ambulances'),
    uploadBuffer(licenseDoc.buffer, 'ambulances'),
    uploadBuffer(photo.buffer, 'ambulances'),
    uploadBuffer(idDoc.buffer, 'ambulances'),
    uploadBuffer(permit.buffer, 'ambulances')
  ]);

  try {
    await Ambulance.findOneAndUpdate(
      { userId: req.user.id },
      {
        vehicleNumber,
        rcDocumentUrl: rcUpload.url,
        rcDocumentPublicId: rcUpload.publicId,
        driverName,
        driverLicenseNumberEncrypted: encrypt(driverLicenseNumber),
        driverLicenseNumberHash: hashForLookup(driverLicenseNumber),
        driverLicenseDocUrl: licenseUpload.url,
        driverLicenseDocPublicId: licenseUpload.publicId,
        driverPhotoUrl: photoUpload.url,
        driverPhotoPublicId: photoUpload.publicId,
        driverIdDocUrl: idUpload.url,
        driverIdDocPublicId: idUpload.publicId,
        permitDocumentUrl: permitUpload.url,
        permitDocumentPublicId: permitUpload.publicId,
        city,
        location: { type: 'Point', coordinates: [Number(lng), Number(lat)] }
      },
      { runValidators: true }
    );
  } catch (err) {
    if (err.code === 11000) {
      return fail(res, 'This vehicle number or driver license number is already registered to another account', 409);
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
  updateLocation: asyncHandler(updateLocation),
  listAssignedRequests: asyncHandler(listAssignedRequests),
  resolveRequest: asyncHandler(resolveRequest),
  resubmitApplication: asyncHandler(resubmitApplication)
};