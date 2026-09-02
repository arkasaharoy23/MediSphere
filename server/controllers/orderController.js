const mongoose = require('mongoose');
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

  if (
    !pharmacyId ||
    typeof deliveryAddress !== 'string' ||
    !deliveryAddress.trim() ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return fail(
      res,
      'pharmacyId, deliveryAddress, and at least one item are required'
    );
  }

  const pharmacyUser = await User.findOne({
    _id: pharmacyId,
    role: 'pharmacy',
    verificationStatus: 'verified'
  });

  if (!pharmacyUser) {
    return fail(res, 'Selected pharmacy is not available for ordering', 404);
  }

  const orderItems = [];
  let totalAmount = 0;
  let needsPrescription = false;

  for (const item of items) {
    if (!item?.medicineId) {
      return fail(res, 'Invalid medicine selected');
    }

    const quantity = Number(item.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      return fail(res, 'Medicine quantity must be a positive integer');
    }

    const medicine = await Medicine.findOne({
      _id: item.medicineId,
      pharmacyId
    });

    if (!medicine) {
      return fail(
        res,
        'One or more selected medicines are no longer available'
      );
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
    return fail(
      res,
      'One or more items require a prescription — please attach one'
    );
  }

  let prescriptionUrl = null;
  let prescriptionPublicId = null;

  if (prescriptionFile) {
    const upload = await uploadBuffer(
      prescriptionFile.buffer,
      'prescriptions-orders'
    );

    prescriptionUrl = upload.url;
    prescriptionPublicId = upload.publicId;
  }

  const session = await mongoose.startSession();

  try {
    let createdOrder;

    await session.withTransaction(async () => {
      for (const item of orderItems) {
        const updatedMedicine = await Medicine.findOneAndUpdate(
          {
            _id: item.medicineId,
            pharmacyId,
            stock: { $gte: item.quantity }
          },
          {
            $inc: { stock: -item.quantity }
          },
          {
            new: true,
            session
          }
        );

        if (!updatedMedicine) {
          throw new Error(
            `INSUFFICIENT_STOCK:${item.medicineName}`
          );
        }
      }

      const orders = await Order.create(
        [
          {
            patientId: req.user.id,
            pharmacyId,
            items: orderItems,
            totalAmount,
            deliveryAddress: deliveryAddress.trim(),
            prescriptionUrl,
            prescriptionPublicId
          }
        ],
        { session }
      );

      createdOrder = orders[0];
    });

    return success(res, createdOrder, 201);
  } catch (err) {
    if (err.message?.startsWith('INSUFFICIENT_STOCK:')) {
      const medicineName = err.message.substring(
        'INSUFFICIENT_STOCK:'.length
      );

      return fail(
        res,
        `Not enough stock for ${medicineName}`,
        409
      );
    }

    throw err;
  } finally {
    await session.endSession();
  }
}

async function listMine(req, res) {
  const isPharmacy = req.user.role === 'pharmacy';

  const filter = isPharmacy
    ? { pharmacyId: req.user.id }
    : { patientId: req.user.id };

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  if (!orders.length) {
    return success(res, []);
  }

  if (isPharmacy) {
    const patientIds = [
      ...new Set(
        orders.map(order => order.patientId.toString())
      )
    ];

    const patients = await User.find({
      _id: { $in: patientIds }
    })
      .select('email')
      .lean();

    const patientMap = new Map(
      patients.map(patient => [
        patient._id.toString(),
        patient.email
      ])
    );

    return success(
      res,
      orders.map(order => ({
        id: order._id,
        items: order.items,
        totalAmount: order.totalAmount,
        deliveryAddress: order.deliveryAddress,
        status: order.status,
        patientEmail:
          patientMap.get(order.patientId.toString()) ||
          'Unknown patient',
        prescriptionViewUrl: order.prescriptionPublicId
          ? getSignedViewUrl(order.prescriptionPublicId)
          : null,
        createdAt: order.createdAt
      }))
    );
  }

  const pharmacyIds = [
    ...new Set(
      orders.map(order => order.pharmacyId.toString())
    )
  ];

  const pharmacies = await Pharmacy.find({
    userId: { $in: pharmacyIds }
  })
    .select('userId pharmacyName')
    .lean();

  const pharmacyMap = new Map(
    pharmacies.map(pharmacy => [
      pharmacy.userId.toString(),
      pharmacy.pharmacyName
    ])
  );

  return success(
    res,
    orders.map(order => ({
      id: order._id,
      items: order.items,
      totalAmount: order.totalAmount,
      deliveryAddress: order.deliveryAddress,
      status: order.status,
      pharmacyName:
        pharmacyMap.get(order.pharmacyId.toString()) ||
        'Unknown pharmacy',
      prescriptionViewUrl: order.prescriptionPublicId
        ? getSignedViewUrl(order.prescriptionPublicId)
        : null,
      createdAt: order.createdAt
    }))
  );
}

async function cancelOrder(req, res) {
  const { id } = req.params;

  const session = await mongoose.startSession();

  try {
    let cancelledOrder;

    await session.withTransaction(async () => {
      const order = await Order.findOne({
        _id: id,
        patientId: req.user.id,
        status: 'pending'
      }).session(session);

      if (!order) {
        throw new Error('ORDER_NOT_CANCELLABLE');
      }

      for (const item of order.items) {
        await Medicine.updateOne(
          { _id: item.medicineId },
          { $inc: { stock: item.quantity } },
          { session }
        );
      }

      order.status = 'cancelled';
      await order.save({ session });

      cancelledOrder = order;
    });

    return success(res, {
      id: cancelledOrder._id,
      status: cancelledOrder.status
    });
  } catch (err) {
    if (err.message === 'ORDER_NOT_CANCELLABLE') {
      const order = await Order.findById(id);

      if (!order) {
        return fail(res, 'Order not found', 404);
      }

      if (
        order.patientId.toString() !==
        req.user.id.toString()
      ) {
        return fail(
          res,
          'You do not have access to this order',
          403
        );
      }

      return fail(
        res,
        'This order can no longer be cancelled',
        409
      );
    }

    throw err;
  } finally {
    await session.endSession();
  }
}

async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = [
    'confirmed',
    'out_for_delivery',
    'delivered',
    'cancelled'
  ];

  if (!allowed.includes(status)) {
    return fail(
      res,
      `status must be one of: ${allowed.join(', ')}`
    );
  }

  const session = await mongoose.startSession();

  try {
    let updatedOrder;

    await session.withTransaction(async () => {
      const order = await Order.findOne({
        _id: id,
        pharmacyId: req.user.id
      }).session(session);

      if (!order) {
        throw new Error('ORDER_NOT_FOUND');
      }

      if (
        order.status === 'delivered' ||
        order.status === 'cancelled'
      ) {
        throw new Error('ORDER_FINALIZED');
      }

      if (status === 'cancelled') {
        for (const item of order.items) {
          await Medicine.updateOne(
            { _id: item.medicineId },
            { $inc: { stock: item.quantity } },
            { session }
          );
        }
      }

      order.status = status;
      await order.save({ session });

      updatedOrder = order;
    });

    return success(res, {
      id: updatedOrder._id,
      status: updatedOrder.status
    });
  } catch (err) {
    if (err.message === 'ORDER_NOT_FOUND') {
      return fail(res, 'Order not found', 404);
    }

    if (err.message === 'ORDER_FINALIZED') {
      return fail(
        res,
        'This order has already been finalized',
        409
      );
    }

    throw err;
  } finally {
    await session.endSession();
  }
}

module.exports = {
  createOrder: asyncHandler(createOrder),
  listMine: asyncHandler(listMine),
  cancelOrder: asyncHandler(cancelOrder),
  updateStatus: asyncHandler(updateStatus)
};