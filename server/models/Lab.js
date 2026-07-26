const mongoose = require('mongoose');

const labSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  labName: { type: String, required: true },
  licenseNumberEncrypted: { type: String, required: true },
  licenseNumberHash: { type: String, required: true, unique: true },
  documentUrl: { type: String, required: true },
  documentPublicId: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Lab', labSchema);