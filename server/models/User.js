const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  phoneEncrypted: { type: String, required: true },
  phoneHash: { type: String, required: true, unique: true },
  role: {
    type: String,
    required: true,
    enum: ['patient', 'doctor', 'hospital', 'lab', 'pharmacy', 'ambulance', 'admin']
  },
  profilePicUrl: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  verificationStatus: {
    type: String,
    enum: ['verified', 'pending', 'rejected'],
    default: 'pending'
  },
  rejectionReason: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);