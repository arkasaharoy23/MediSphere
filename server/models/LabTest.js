const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema({
  labId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  turnaroundDays: { type: Number, required: true, min: 0 }
}, { timestamps: true });

module.exports = mongoose.model('LabTest', labTestSchema);