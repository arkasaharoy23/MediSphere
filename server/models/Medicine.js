const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  pharmacyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  requiresPrescription: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Medicine', medicineSchema);