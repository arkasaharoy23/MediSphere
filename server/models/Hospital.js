const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  hospitalName: { type: String, required: true },
  address: { type: String, required: true },
  licenseNumberEncrypted: { type: String, required: true },
  licenseNumberHash: { type: String, required: true, unique: true },
  documentUrls: {
    type: [String],
    required: true,
    validate: {
      validator: (arr) => arr.length >= 2,
      message: 'Hospitals must upload at least two verification documents'
    }
  },
  documentPublicIds: { type: [String], required: true }
}, { timestamps: true });

module.exports = mongoose.model('Hospital', hospitalSchema);