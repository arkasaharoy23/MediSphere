const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  fullName: { type: String, required: true },
  specialization: { type: String, required: true },
  degree: { type: String, required: true },
  degreeCertificateUrl: { type: String, required: true },
  degreeCertificatePublicId: { type: String, required: true },
  registrationNumberEncrypted: { type: String, required: true },
  registrationNumberHash: { type: String, required: true, unique: true },
  registrationCertificateUrl: { type: String, required: true },
  registrationCertificatePublicId: { type: String, required: true },
  city: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  }
}, { timestamps: true });

doctorSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Doctor', doctorSchema);