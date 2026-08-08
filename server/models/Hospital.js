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
  documentPublicIds: { type: [String], required: true },
  city: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  departments: [{
    name: { type: String, required: true },
    description: { type: String, default: '' }
  }],
  beds: [{
    category: { type: String, required: true },
    total: { type: Number, required: true, min: 0 },
    available: { type: Number, required: true, min: 0 }
  }]
}, { timestamps: true });

hospitalSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Hospital', hospitalSchema);