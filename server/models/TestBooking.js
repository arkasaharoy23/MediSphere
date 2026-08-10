const mongoose = require('mongoose');

const testBookingSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  labId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabTest', required: true },
  testName: { type: String, required: true },
  price: { type: Number, required: true },
  preferredDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['pending', 'sample_collected', 'processing', 'completed', 'cancelled'],
    default: 'pending'
  },
  reportUrl: { type: String, default: null },
  reportPublicId: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('TestBooking', testBookingSchema);