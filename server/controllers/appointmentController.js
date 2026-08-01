const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { success, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

async function createAppointment(req, res) {
  const { doctorId, date, timeSlot, reason } = req.body;

  if (!doctorId || !date || !timeSlot) {
    return fail(res, 'doctorId, date, and timeSlot are required');
  }

  if (new Date(date) < new Date().setHours(0, 0, 0, 0)) {
    return fail(res, 'Appointment date cannot be in the past');
  }

  const doctorUser = await User.findOne({ _id: doctorId, role: 'doctor', verificationStatus: 'verified' });
  if (!doctorUser) {
    return fail(res, 'Selected doctor is not available for booking', 404);
  }

  const appointment = await Appointment.create({
    patientId: req.user.id,
    doctorId,
    date,
    timeSlot,
    reason: reason || ''
  });

  return success(res, appointment, 201);
}

async function listMine(req, res) {
  const isDoctor = req.user.role === 'doctor';
  const filter = isDoctor ? { doctorId: req.user.id } : { patientId: req.user.id };

  const appointments = await Appointment.find(filter).sort({ date: 1 });

  const results = await Promise.all(
    appointments.map(async (appt) => {
      const doctorRecord = await Doctor.findOne({ userId: appt.doctorId });

      let patientName;
      let patientEmail;
      if (isDoctor) {
        const patientUser = await User.findById(appt.patientId);
        const patientRecord = await Patient.findOne({ userId: appt.patientId });
        patientEmail = patientUser?.email;
        patientName = patientRecord?.fullName || patientUser?.email || 'Unknown patient';
      }

      return {
        id: appt._id,
        date: appt.date,
        timeSlot: appt.timeSlot,
        reason: appt.reason,
        status: appt.status,
        doctorName: doctorRecord?.fullName || 'Unknown doctor',
        doctorSpecialization: doctorRecord?.specialization || '',
        patientEmail,
        patientName
      };
    })
  );

  return success(res, results);
}

async function cancelAppointment(req, res) {
  const { id } = req.params;

  const appointment = await Appointment.findById(id);
  if (!appointment) {
    return fail(res, 'Appointment not found', 404);
  }

  const isOwner =
    appointment.patientId.toString() === req.user.id.toString() ||
    appointment.doctorId.toString() === req.user.id.toString();

  if (!isOwner) {
    return fail(res, 'You do not have access to this appointment', 403);
  }

  if (appointment.status === 'cancelled' || appointment.status === 'completed') {
    return fail(res, 'This appointment can no longer be cancelled');
  }

  appointment.status = 'cancelled';
  await appointment.save();

  return success(res, { id: appointment._id, status: appointment.status });
}

async function confirmAppointment(req, res) {
  const { id } = req.params;

  const appointment = await Appointment.findById(id);
  if (!appointment) {
    return fail(res, 'Appointment not found', 404);
  }

  if (appointment.doctorId.toString() !== req.user.id.toString()) {
    return fail(res, 'You do not have access to this appointment', 403);
  }

  if (appointment.status !== 'pending') {
    return fail(res, 'Only pending appointments can be confirmed');
  }

  appointment.status = 'confirmed';
  await appointment.save();

  return success(res, { id: appointment._id, status: appointment.status });
}

async function completeAppointment(req, res) {
  const { id } = req.params;

  const appointment = await Appointment.findById(id);
  if (!appointment) {
    return fail(res, 'Appointment not found', 404);
  }

  if (appointment.doctorId.toString() !== req.user.id.toString()) {
    return fail(res, 'You do not have access to this appointment', 403);
  }

  if (appointment.status !== 'confirmed') {
    return fail(res, 'Only confirmed appointments can be marked complete');
  }

  appointment.status = 'completed';
  await appointment.save();

  return success(res, { id: appointment._id, status: appointment.status });
}

module.exports = {
  createAppointment: asyncHandler(createAppointment),
  listMine: asyncHandler(listMine),
  cancelAppointment: asyncHandler(cancelAppointment),
  confirmAppointment: asyncHandler(confirmAppointment),
  completeAppointment: asyncHandler(completeAppointment)
};