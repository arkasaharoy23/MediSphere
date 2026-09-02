const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const { success, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

async function createAppointment(req, res) {
  const {
    doctorId,
    date,
    timeSlot,
    reason,
    visitLocation
  } = req.body;

  if (!doctorId || !date || !timeSlot) {
    return fail(
      res,
      'doctorId, date, and timeSlot are required'
    );
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return fail(res, 'Invalid appointment date');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (parsedDate < today) {
    return fail(
      res,
      'Appointment date cannot be in the past'
    );
  }

  if (
    typeof timeSlot !== 'string' ||
    !timeSlot.trim()
  ) {
    return fail(
      res,
      'A valid time slot is required'
    );
  }

  const doctorUser = await User.findOne({
    _id: doctorId,
    role: 'doctor',
    verificationStatus: 'verified'
  });

  if (!doctorUser) {
    return fail(
      res,
      'Selected doctor is not available for booking',
      404
    );
  }

  const appointmentData = {
    patientId: req.user.id,
    doctorId,
    date: parsedDate,
    timeSlot: timeSlot.trim(),
    reason:
      typeof reason === 'string'
        ? reason.trim()
        : ''
  };

  if (visitLocation === 'hospital') {
    const doctorRecord = await Doctor.findOne({
      userId: doctorId
    });

    if (!doctorRecord?.hospitalId) {
      return fail(
        res,
        'This doctor is not currently affiliated with a hospital'
      );
    }

    appointmentData.visitLocation = 'hospital';
    appointmentData.hospitalId =
      doctorRecord.hospitalId;
  }

  try {
    const appointment =
      await Appointment.create(appointmentData);

    return success(res, appointment, 201);
  } catch (err) {
    if (err.code === 11000) {
      return fail(
        res,
        'This time slot is already taken',
        409
      );
    }

    throw err;
  }
}

async function listMine(req, res) {
  const isDoctor = req.user.role === 'doctor';
  const filter = isDoctor ? { doctorId: req.user.id } : { patientId: req.user.id };

  const appointments = await Appointment.find(filter).sort({ date: 1 });

  const results = await Promise.all(
    appointments.map(async (appt) => {
      const doctorRecord = await Doctor.findOne({ userId: appt.doctorId });

      let hospitalName = null;
      if (appt.visitLocation === 'hospital' && appt.hospitalId) {
        const hospitalRecord = await Hospital.findOne({ userId: appt.hospitalId });
        hospitalName = hospitalRecord?.hospitalName || null;
      }

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
        visitLocation: appt.visitLocation,
        hospitalName,
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