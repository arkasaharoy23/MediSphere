const mongoose = require('mongoose');

const pharmacySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  pharmacyName: { type: String, required: true },
  drugLicenseNumberEncrypted: { type: String, required: true },
  drugLicenseNumberHash: { type: String, required: true, unique: true },
  documentUrl: { type: String, required: true },
  documentPublicId: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Pharmacy', pharmacySchema);