const mongoose = require('mongoose');

const emergencyRequestSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'cancelled'],
    default: 'active'
  },
  bloodGroup: { type: String, default: 'unknown' },
  emergencyContactName: { type: String, default: '' },
  emergencyContactPhoneEncrypted: { type: String, default: null },
  ambulanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('EmergencyRequest', emergencyRequestSchema);