const Prescription = require('../models/Prescription');
const MedicalRecord = require('../models/MedicalRecord');
const Doctor = require('../models/Doctor');
const { getSignedViewUrl } = require('../services/cloudinaryService');
const { success } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

async function listMine(req, res) {
  const prescriptions = await Prescription.find({ patientId: req.user.id }).sort({ createdAt: -1 });
  const records = await MedicalRecord.find({ patientId: req.user.id }).sort({ createdAt: -1 });

  const prescriptionItems = await Promise.all(
    prescriptions.map(async (p) => {
      const doctorRecord = await Doctor.findOne({ userId: p.doctorId });
      return {
        id: p._id,
        type: 'prescription',
        title: `Prescription from ${doctorRecord?.fullName || 'your doctor'}`,
        medicines: p.medicines,
        notes: p.notes,
        createdAt: p.createdAt
      };
    })
  );

  const recordItems = records.map((r) => ({
    id: r._id,
    type: r.recordType,
    title: r.title,
    notes: r.notes,
    documentUrl: r.documentPublicId ? getSignedViewUrl(r.documentPublicId) : r.documentUrl,
    createdAt: r.createdAt
  }));

  const combined = [...prescriptionItems, ...recordItems].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return success(res, combined);
}

module.exports = { listMine: asyncHandler(listMine) };