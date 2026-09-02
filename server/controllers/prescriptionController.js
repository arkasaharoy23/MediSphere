const Prescription = require('../models/Prescription');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const { success, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

async function createPrescription(req, res) {
  const { patientId, appointmentId, medicines, notes } = req.body;

  if (!patientId || !Array.isArray(medicines) || medicines.length === 0) {
    return fail(res, 'patientId and at least one medicine are required');
  }

  for (const med of medicines) {
    if (!med.name || !med.dosage || !med.frequency || !med.duration) {
      return fail(res, 'Each medicine needs a name, dosage, frequency, and duration');
    }
  }

  const hasRelationship = await Appointment.findOne({ doctorId: req.user.id, patientId, status: { $in: ['confirmed', 'completed'] } });
  if (!hasRelationship) {
    return fail(res, 'You can only prescribe to patients you have an appointment history with', 403);
  }

  const prescription = await Prescription.create({
    patientId,
    doctorId: req.user.id,
    appointmentId: appointmentId || null,
    medicines,
    notes: notes || ''
  });

  return success(res, prescription, 201);
}

async function listMine(req, res) {
  const prescriptions = await Prescription.find({ doctorId: req.user.id }).sort({ createdAt: -1 });

  const results = await Promise.all(
    prescriptions.map(async (p) => {
      const patientRecord = await Patient.findOne({ userId: p.patientId });
      return {
        id: p._id,
        patientName: patientRecord?.fullName || 'Unknown patient',
        medicines: p.medicines,
        notes: p.notes,
        createdAt: p.createdAt
      };
    })
  );

  return success(res, results);
}

module.exports = { createPrescription: asyncHandler(createPrescription), listMine: asyncHandler(listMine) };