const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const Lab = require('../models/Lab');
const Pharmacy = require('../models/Pharmacy');
const Ambulance = require('../models/Ambulance');
const { getSignedViewUrl } = require('../services/cloudinaryService');
const { decrypt } = require('../utils/helpers');
const { success, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const ROLE_MODELS = { doctor: Doctor, hospital: Hospital, lab: Lab, pharmacy: Pharmacy, ambulance: Ambulance };

function buildRoleView(role, record) {
  if (!record) return {};

  if (role === 'doctor') {
    return {
      fullName: record.fullName,
      specialization: record.specialization,
      degree: Array.isArray(record.degree) ? record.degree.join(', ') : record.degree,
      registrationNumber: decrypt(record.registrationNumberEncrypted),
      documents: [
        { label: 'Registration certificate', url: getSignedViewUrl(record.registrationCertificatePublicId) },
        { label: 'Degree certificate', url: getSignedViewUrl(record.degreeCertificatePublicId) }
      ]
    };
  }

  if (role === 'hospital') {
    return {
      hospitalName: record.hospitalName,
      address: record.address,
      licenseNumber: decrypt(record.licenseNumberEncrypted),
      documents: record.documentPublicIds.map((id, index) => ({
        label: `Verification document ${index + 1}`,
        url: getSignedViewUrl(id)
      }))
    };
  }

  if (role === 'lab') {
    return {
      labName: record.labName,
      licenseNumber: decrypt(record.licenseNumberEncrypted),
      documents: [{ label: 'License document', url: getSignedViewUrl(record.documentPublicId) }]
    };
  }

  if (role === 'pharmacy') {
    return {
      pharmacyName: record.pharmacyName,
      drugLicenseNumber: decrypt(record.drugLicenseNumberEncrypted),
      documents: [{ label: 'Drug license document', url: getSignedViewUrl(record.documentPublicId) }]
    };
  }

  if (role === 'ambulance') {
    return {
      vehicleNumber: record.vehicleNumber,
      driverName: record.driverName,
      driverLicenseNumber: decrypt(record.driverLicenseNumberEncrypted),
      documents: [
        { label: 'RC document', url: getSignedViewUrl(record.rcDocumentPublicId) },
        { label: "Driver's license", url: getSignedViewUrl(record.driverLicenseDocPublicId) },
        { label: "Driver's photo", url: getSignedViewUrl(record.driverPhotoPublicId) },
        { label: "Driver's ID document", url: getSignedViewUrl(record.driverIdDocPublicId) },
        { label: 'Operating permit', url: getSignedViewUrl(record.permitDocumentPublicId) }
      ]
    };
  }

  return {};
}

async function listByRole(req, res) {
  const { role } = req.params;
  const status = req.query.status || 'pending';

  if (!ROLE_MODELS[role]) {
    return fail(res, 'Unknown role');
  }

  const query = { role };
  if (status !== 'all') {
    query.verificationStatus = status;
  }

  const users = await User.find(query).sort({ createdAt: -1 });
  const Model = ROLE_MODELS[role];

  const results = await Promise.all(
    users.map(async (user) => {
      const record = await Model.findOne({ userId: user._id });
      return {
        userId: user._id,
        role: user.role,
        email: user.email,
        phone: decrypt(user.phoneEncrypted),
        verificationStatus: user.verificationStatus,
        rejectionReason: user.rejectionReason,
        isActive: user.isActive,
        submittedAt: user.createdAt,
        ...buildRoleView(user.role, record)
      };
    })
  );

  return success(res, results);
}

async function verifyUser(req, res) {
  const { userId } = req.params;
  const { decision, reason } = req.body;

  if (!['approved', 'rejected'].includes(decision)) {
    return fail(res, 'decision must be "approved" or "rejected"');
  }

  if (decision === 'rejected' && !reason?.trim()) {
    return fail(res, 'A rejection reason is required');
  }

  const user = await User.findById(userId);
  if (!user) {
    return fail(res, 'User not found', 404);
  }

  user.verificationStatus = decision === 'approved' ? 'verified' : 'rejected';
  user.rejectionReason = decision === 'rejected' ? reason.trim() : null;
  await user.save();

  return success(res, { userId: user._id, verificationStatus: user.verificationStatus });
}

async function listDegreeUpdates(req, res) {
  const doctors = await Doctor.find({ 'additionalDegrees.status': 'pending' }).populate('userId', 'email');

  const results = doctors.flatMap((doctor) =>
    doctor.additionalDegrees
      .filter((entry) => entry.status === 'pending')
      .map((entry) => ({
        userId: doctor.userId._id,
        doctorEmail: doctor.userId.email,
        fullName: doctor.fullName,
        degreeId: entry._id,
        degree: entry.degree,
        certificateViewUrl: getSignedViewUrl(entry.certificatePublicId),
        submittedAt: entry.submittedAt
      }))
  );

  return success(res, results);
}

async function reviewDegreeUpdate(req, res) {
  const { userId, degreeId } = req.params;
  const { decision, reason } = req.body;

  if (!['verified', 'rejected'].includes(decision)) {
    return fail(res, 'decision must be "verified" or "rejected"');
  }

  if (decision === 'rejected' && !reason?.trim()) {
    return fail(res, 'A rejection reason is required');
  }

  const doctor = await Doctor.findOne({ userId, 'additionalDegrees._id': degreeId });
  if (!doctor) {
    return fail(res, 'Degree submission not found', 404);
  }

  const entry = doctor.additionalDegrees.id(degreeId);
  entry.status = decision;
  entry.rejectionReason = decision === 'rejected' ? reason.trim() : null;

  if (decision === 'verified' && !doctor.degree.includes(entry.degree)) {
    doctor.degree.push(entry.degree);
  }

  await doctor.save();

  return success(res, { message: `Degree ${decision}` });
}

async function listUsers(req, res) {
  const { role, search } = req.query;
  const query = {};

  if (role && role !== 'all') {
    query.role = role;
  }

  if (search) {
    query.email = { $regex: search, $options: 'i' };
  }

  const users = await User.find(query).sort({ createdAt: -1 });

  const results = users.map((user) => ({
    userId: user._id,
    email: user.email,
    role: user.role,
    verificationStatus: user.verificationStatus,
    isActive: user.isActive,
    createdAt: user.createdAt
  }));

  return success(res, results);
}

async function toggleUserActive(req, res) {
  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    return fail(res, 'User not found', 404);
  }

  if (user.role === 'admin') {
    return fail(res, 'Admin accounts cannot be suspended from here', 403);
  }

  user.isActive = !user.isActive;
  await user.save();

  return success(res, { userId: user._id, isActive: user.isActive });
}

async function getAnalytics(req, res) {
  const totalUsers = await User.countDocuments();

  const byRole = await User.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } }
  ]);

  const byStatus = await User.aggregate([
    { $group: { _id: '$verificationStatus', count: { $sum: 1 } } }
  ]);

  const activeCount = await User.countDocuments({ isActive: true });
  const suspendedCount = await User.countDocuments({ isActive: false });

  return success(res, {
    totalUsers,
    activeCount,
    suspendedCount,
    byRole: byRole.map((r) => ({ role: r._id, count: r.count })),
    byStatus: byStatus.map((s) => ({ status: s._id, count: s.count }))
  });
}

module.exports = {
  listByRole: asyncHandler(listByRole),
  verifyUser: asyncHandler(verifyUser),
  listDegreeUpdates: asyncHandler(listDegreeUpdates),
  reviewDegreeUpdate: asyncHandler(reviewDegreeUpdate),
  listUsers: asyncHandler(listUsers),
  toggleUserActive: asyncHandler(toggleUserActive),
  getAnalytics: asyncHandler(getAnalytics)
};