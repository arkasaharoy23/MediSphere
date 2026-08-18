const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const Pharmacy = require('../models/Pharmacy');
const User = require('../models/User');
const { uploadBuffer, getSignedViewUrl } = require('../services/cloudinaryService');
const { success, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

async function createOrder(req, res) {
  let items;
  try {
    items = JSON.parse(req.body.items || '[]');
  } catch {
    return fail(res, 'Invalid items format');
  }

  const { pharmacyId, deliveryAddress } = req.body;

  if (!pharmacyId || !deliveryAddress?.trim() || !Array.isArray(items) || items.length === 0) {
    return fail(res, 'pharmacyId, deliveryAddress, and at least one item are required');
  }

  const pharmacyUser = await User.findOne({ _id: pharmacyId, role: 'pharmacy', verificationStatus: 'verified' });
  if (!pharmacyUser) {
    return fail(res, 'Selected pharmacy is not available for ordering', 404);
  }

  const orderItems = [];
  let totalAmount = 0;
  let needsPrescription = false;

  for (const item of items) {
    const medicine = await Medicine.findOne({ _id: item.medicineId, pharmacyId });
    if (!medicine) {
      return fail(res, 'One or more selected medicines are no longer available');
    }
    const quantity = Number(item.quantity);
    if (!quantity || quantity < 1) {
      return fail(res, `Invalid quantity for ${medicine.name}`);
    }
    if (medicine.stock < quantity) {
      return fail(res, `Not enough stock for ${medicine.name} (only ${medicine.stock} left)`);
    }
    if (medicine.requiresPrescription) {
      needsPrescription = true;
    }

    orderItems.push({
      medicineId: medicine._id,
      medicineName: medicine.name,
      price: medicine.price,
      quantity
    });
    totalAmount += medicine.price * quantity;
  }

  const prescriptionFile = req.files?.prescriptionImage?.[0];
  if (needsPrescription && !prescriptionFile) {
    return fail(res, 'One or more items require a prescription — please attach one');
  }

  let prescriptionUrl = null;
  let prescriptionPublicId = null;
  if (prescriptionFile) {
    const upload = await uploadBuffer(prescriptionFile.buffer, 'prescriptions-orders');
    prescriptionUrl = upload.url;
    prescriptionPublicId = upload.publicId;
  }

  for (const item of orderItems) {
    await Medicine.updateOne({ _id: item.medicineId }, { $inc: { stock: -item.quantity } });
  }

  const order = await Order.create({
    patientId: req.user.id,
    pharmacyId,
    items: orderItems,
    totalAmount,
    deliveryAddress: deliveryAddress.trim(),
    prescriptionUrl,
    prescriptionPublicId
  });

  return success(res, order, 201);
}

async function listMine(req, res) {
  const isPharmacy = req.user.role === 'pharmacy';
  const filter = isPharmacy ? { pharmacyId: req.user.id } : { patientId: req.user.id };

  const orders = await Order.find(filter).sort({ createdAt: -1 });

  const results = await Promise.all(
    orders.map(async (order) => {
      let pharmacyName;
      let patientEmail;

      if (isPharmacy) {
        const patientUser = await User.findById(order.patientId);
        patientEmail = patientUser?.email || 'Unknown patient';
      } else {
        const pharmacyRecord = await Pharmacy.findOne({ userId: order.pharmacyId });
        pharmacyName = pharmacyRecord?.pharmacyName || 'Unknown pharmacy';
      }

      return {
        id: order._id,
        items: order.items,
        totalAmount: order.totalAmount,
        deliveryAddress: order.deliveryAddress,
        status: order.status,
        pharmacyName,
        patientEmail,
        prescriptionViewUrl: order.prescriptionPublicId ? getSignedViewUrl(order.prescriptionPublicId) : null,
        createdAt: order.createdAt
      };
    })
  );

  return success(res, results);
}

async function cancelOrder(req, res) {
  const { id } = req.params;

  const order = await Order.findById(id);
  if (!order) return fail(res, 'Order not found', 404);

  if (order.patientId.toString() !== req.user.id.toString()) {
    return fail(res, 'You do not have access to this order', 403);
  }

  if (order.status !== 'pending') {
    return fail(res, 'This order can no longer be cancelled');
  }

  for (const item of order.items) {
    await Medicine.updateOne({ _id: item.medicineId }, { $inc: { stock: item.quantity } });
  }

  order.status = 'cancelled';
  await order.save();

  return success(res, { id: order._id, status: order.status });
}

async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ['confirmed', 'out_for_delivery', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) {
    return fail(res, `status must be one of: ${allowed.join(', ')}`);
  }

  const order = await Order.findById(id);
  if (!order) return fail(res, 'Order not found', 404);

  if (order.pharmacyId.toString() !== req.user.id.toString()) {
    return fail(res, 'You do not have access to this order', 403);
  }

  if (['delivered', 'cancelled'].includes(order.status)) {
    return fail(res, 'This order has already been finalized');
  }

  if (status === 'cancelled') {
    for (const item of order.items) {
      await Medicine.updateOne({ _id: item.medicineId }, { $inc: { stock: item.quantity } });
    }
  }

  order.status = status;
  await order.save();

  return success(res, { id: order._id, status: order.status });
}

module.exports = {
  createOrder: asyncHandler(createOrder),
  listMine: asyncHandler(listMine),
  cancelOrder: asyncHandler(cancelOrder),
  updateStatus: asyncHandler(updateStatus)
};