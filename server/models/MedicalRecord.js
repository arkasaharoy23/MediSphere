const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recordType: {
    type: String,
    enum: ['lab_report', 'visit_summary', 'other'],
    required: true
  },
  title: { type: String, required: true },
  documentUrl: { type: String, default: null },
  documentPublicId: { type: String, default: null },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);