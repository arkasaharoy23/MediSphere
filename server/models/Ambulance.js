const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  vehicleNumber: { type: String, required: true, unique: true },
  rcDocumentUrl: { type: String, required: true },
  rcDocumentPublicId: { type: String, required: true },
  driverName: { type: String, required: true },
  driverLicenseNumberEncrypted: { type: String, required: true },
  driverLicenseNumberHash: { type: String, required: true, unique: true },
  driverLicenseDocUrl: { type: String, required: true },
  driverLicenseDocPublicId: { type: String, required: true },
  driverPhotoUrl: { type: String, required: true },
  driverPhotoPublicId: { type: String, required: true },
  driverIdDocUrl: { type: String, required: true },
  driverIdDocPublicId: { type: String, required: true },
  permitDocumentUrl: { type: String, required: true },
  permitDocumentPublicId: { type: String, required: true },
  city: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  }
}, { timestamps: true });

ambulanceSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Ambulance', ambulanceSchema);