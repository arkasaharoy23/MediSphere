const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  fullName: { type: String, required: true },
  specialization: { type: String, required: true },
  registrationNumberEncrypted: { type: String, required: true },
  registrationNumberHash: { type: String, required: true, unique: true },
  registrationCertificateUrl: { type: String, required: true },
  registrationCertificatePublicId: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);