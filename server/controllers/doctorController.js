const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
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

  let hospitalName = null;
  if (record.hospitalId) {
    const hospitalRecord = await Hospital.findOne({ userId: record.hospitalId });
    hospitalName = hospitalRecord?.hospitalName || null;
  }

  return success(res, {
    fullName: record.fullName,
    specialization: record.specialization,
    city: record.city,
    location: record.location,
    hospitalId: record.hospitalId,
    hospitalName,
    degree: record.degree,
    degreeCertificateViewUrl: getSignedViewUrl(record.degreeCertificatePublicId),
    registrationNumber: decrypt(record.registrationNumberEncrypted),
    registrationCertificateViewUrl: getSignedViewUrl(record.registrationCertificatePublicId),
    additionalDegrees: record.additionalDegrees.map((entry) => ({
      id: entry._id,
      degree: entry.degree,
      status: entry.status,
      rejectionReason: entry.rejectionReason,
      certificateViewUrl: getSignedViewUrl(entry.certificatePublicId),
      submittedAt: entry.submittedAt
    }))
  });
}

async function addDegree(req, res) {
  const { degree } = req.body;
  const certificate = req.files?.additionalDegreeCertificate?.[0];

  if (!degree || !DEGREES.includes(degree)) {
    return fail(res, 'Select a valid medical degree from the list');
  }
  if (!certificate) {
    return fail(res, 'Please upload a certificate for this degree');
  }

  const record = await Doctor.findOne({ userId: req.user.id });
  if (!record) {
    return fail(res, 'Doctor profile not found', 404);
  }

  const alreadyHeld = record.degree.includes(degree);
  const alreadyPending = record.additionalDegrees.some(
    (entry) => entry.degree === degree && entry.status !== 'rejected'
  );
  if (alreadyHeld || alreadyPending) {
    return fail(res, 'This degree is already on your profile or awaiting review');
  }

  const certUpload = await uploadBuffer(certificate.buffer, 'doctors');

  record.additionalDegrees.push({
    degree,
    certificateUrl: certUpload.url,
    certificatePublicId: certUpload.publicId,
    status: 'pending'
  });
  await record.save();

  return success(res, { message: 'Degree submitted for admin review' });
}

async function updateProfile(req, res) {
  const { fullName, specialization, city, lat, lng, hospitalId } = req.body;

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

  if (hospitalId) {
    const hospitalUser = await User.findOne({ _id: hospitalId, role: 'hospital', verificationStatus: 'verified' });
    if (!hospitalUser) {
      return fail(res, 'Select a valid, verified hospital');
    }
    update.hospitalId = hospitalId;
  } else if (hospitalId === '') {
    update.hospitalId = null;
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

  const degrees = Array.isArray(degree) ? degree : [degree].filter(Boolean);
  if (!degrees.length) {
    return fail(res, 'Select at least one medical degree');
  }
  if (!degrees.every((d) => DEGREES.includes(d))) {
    return fail(res, 'Select valid medical degrees from the list');
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
        degree: degrees,
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
  addDegree: asyncHandler(addDegree),
  resubmitApplication: asyncHandler(resubmitApplication),
  listMyPatients: asyncHandler(listMyPatients)
};