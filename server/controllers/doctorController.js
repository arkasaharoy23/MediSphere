const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { decrypt, encrypt, hashForLookup } = require('../utils/helpers');
const { getSignedViewUrl, uploadBuffer } = require('../services/cloudinaryService');
const { SPECIALIZATIONS, DEGREES } = require('../utils/constants');
const { success, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

async function getProfile(req, res) {
  const record = await Doctor.findOne({ userId: req.user.id });

  if (!record) {
    return success(res, null);
  }

  return success(res, {
    fullName: record.fullName,
    specialization: record.specialization,
    city: record.city,
    location: record.location,
    degree: record.degree,
    degreeCertificateViewUrl: getSignedViewUrl(record.degreeCertificatePublicId),
    registrationNumber: decrypt(record.registrationNumberEncrypted),
    registrationCertificateViewUrl: getSignedViewUrl(record.registrationCertificatePublicId)
  });
}

async function updateProfile(req, res) {
  const { fullName, specialization, city, lat, lng } = req.body;

  if (!fullName || !specialization || !city) {
    return fail(res, 'Full name, specialization, and city are required');
  }

  if (!SPECIALIZATIONS.includes(specialization)) {
    return fail(res, 'Select a valid specialization from the list');
  }

  const update = { fullName, specialization, city };

  if (lat && lng) {
    update.location = { type: 'Point', coordinates: [Number(lng), Number(lat)] };
  }

  const record = await Doctor.findOneAndUpdate(
    { userId: req.user.id },
    update,
    { new: true }
  );

  if (!record) {
    return fail(res, 'Doctor profile not found', 404);
  }

  return success(res, { message: 'Profile updated' });
}

async function resubmitApplication(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) {
    return fail(res, 'Account not found', 404);
  }

  if (user.verificationStatus !== 'rejected') {
    return fail(res, 'Only rejected applications can be resubmitted');
  }

  const { fullName, specialization, degree, registrationNumber, city, lat, lng } = req.body;
  const cert = req.files?.registrationCertificate?.[0];
  const degreeCert = req.files?.degreeCertificate?.[0];

  if (!fullName || !specialization || !degree || !registrationNumber || !city || !lat || !lng) {
    return fail(res, 'All fields are required to resubmit your application');
  }

  if (!cert || !degreeCert) {
    return fail(res, 'Please re-upload both your registration certificate and degree certificate');
  }

  if (!SPECIALIZATIONS.includes(specialization)) {
    return fail(res, 'Select a valid specialization from the list');
  }

  if (!DEGREES.includes(degree)) {
    return fail(res, 'Select a valid medical degree from the list');
  }

  const [certUpload, degreeCertUpload] = await Promise.all([
    uploadBuffer(cert.buffer, 'doctors'),
    uploadBuffer(degreeCert.buffer, 'doctors')
  ]);

  try {
    await Doctor.findOneAndUpdate(
      { userId: req.user.id },
      {
        fullName,
        specialization,
        degree,
        degreeCertificateUrl: degreeCertUpload.url,
        degreeCertificatePublicId: degreeCertUpload.publicId,
        registrationNumberEncrypted: encrypt(registrationNumber),
        registrationNumberHash: hashForLookup(registrationNumber),
        registrationCertificateUrl: certUpload.url,
        registrationCertificatePublicId: certUpload.publicId,
        city,
        location: { type: 'Point', coordinates: [Number(lng), Number(lat)] }
      }
    );
  } catch (err) {
    if (err.code === 11000) {
      return fail(res, 'This registration number is already registered to another account', 409);
    }
    throw err;
  }

  user.verificationStatus = 'pending';
  user.rejectionReason = null;
  await user.save();

  return success(res, { message: 'Application resubmitted for review' });
}

async function listMyPatients(req, res) {
  const appointments = await Appointment.find({ doctorId: req.user.id });
  const uniquePatientIds = [...new Set(appointments.map((a) => a.patientId.toString()))];

  const results = await Promise.all(
    uniquePatientIds.map(async (pid) => {
      const patientUser = await User.findById(pid);
      const patientRecord = await Patient.findOne({ userId: pid });
      const patientAppointments = appointments
        .filter((a) => a.patientId.toString() === pid)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      return {
        patientId: pid,
        fullName: patientRecord?.fullName || patientUser?.email || 'Unknown patient',
        email: patientUser?.email,
        bloodGroup: patientRecord?.bloodGroup || 'unknown',
        appointmentCount: patientAppointments.length,
        lastVisit: patientAppointments[0]?.date || null
      };
    })
  );

  return success(res, results);
}

module.exports = {
  getProfile: asyncHandler(getProfile),
  updateProfile: asyncHandler(updateProfile),
  resubmitApplication: asyncHandler(resubmitApplication),
  listMyPatients: asyncHandler(listMyPatients)
};