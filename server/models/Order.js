const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pharmacyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    medicineName: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 }
  }],
  totalAmount: { type: Number, required: true },
  deliveryAddress: { type: String, required: true },
  prescriptionUrl: { type: String, default: null },
  prescriptionPublicId: { type: String, default: null },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);