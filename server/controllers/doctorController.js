const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Patient = require('../models/Patient');
const { success } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

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

module.exports = { listMyPatients: asyncHandler(listMyPatients) };