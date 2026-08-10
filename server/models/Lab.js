const mongoose = require('mongoose');

const labSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  labName: { type: String, required: true },
  licenseNumberEncrypted: { type: String, required: true },
  licenseNumberHash: { type: String, required: true, unique: true },
  documentUrl: { type: String, required: true },
  documentPublicId: { type: String, required: true },
  city: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  }
}, { timestamps: true });

labSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Lab', labSchema);