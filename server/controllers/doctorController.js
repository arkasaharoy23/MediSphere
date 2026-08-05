const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { decrypt } = require('../utils/helpers');
const { getSignedViewUrl } = require('../services/cloudinaryService');
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
    registrationNumber: decrypt(record.registrationNumberEncrypted),
    registrationCertificateViewUrl: getSignedViewUrl(record.registrationCertificatePublicId)
  });
}

async function updateProfile(req, res) {
  const { fullName, specialization, city, lat, lng } = req.body;

  if (!fullName || !specialization || !city) {
    return fail(res, 'Full name, specialization, and city are required');
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
  listMyPatients: asyncHandler(listMyPatients)
};