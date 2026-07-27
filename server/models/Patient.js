const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  fullName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'], required: true },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
    default: 'unknown'
  },
  address: { type: String, default: '' },
  emergencyContactName: { type: String, default: '' },
  emergencyContactPhoneEncrypted: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);