const Pharmacy = require('../models/Pharmacy');
const Medicine = require('../models/Medicine');
const User = require('../models/User');
const { decrypt, encrypt, hashForLookup } = require('../utils/helpers');
const { getSignedViewUrl, uploadBuffer } = require('../services/cloudinaryService');
const { success, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

async function getProfile(req, res) {
  const record = await Pharmacy.findOne({ userId: req.user.id });
  if (!record) return success(res, null);

  return success(res, {
    pharmacyName: record.pharmacyName,
    city: record.city,
    location: record.location,
    drugLicenseNumber: decrypt(record.drugLicenseNumberEncrypted),
    documentViewUrl: getSignedViewUrl(record.documentPublicId)
  });
}

async function updateProfile(req, res) {
  const { pharmacyName, city, lat, lng } = req.body;

  if (!pharmacyName || !city) {
    return fail(res, 'Pharmacy name and city are required');
  }

  const update = { pharmacyName, city };
  if (lat && lng) {
    update.location = { type: 'Point', coordinates: [Number(lng), Number(lat)] };
  }

  const record = await Pharmacy.findOneAndUpdate({ userId: req.user.id }, update, { new: true });
  if (!record) return fail(res, 'Pharmacy profile not found', 404);

  return success(res, { message: 'Profile updated' });
}

async function listMyMedicines(req, res) {
  const medicines = await Medicine.find({ pharmacyId: req.user.id }).sort({ name: 1 });
  return success(res, medicines);
}

async function addMedicine(req, res) {
  const { name, description, price, stock, requiresPrescription } = req.body;

  if (!name?.trim() || price == null || stock == null) {
    return fail(res, 'Medicine name, price, and stock are required');
  }
  if (Number(price) < 0 || Number(stock) < 0) {
    return fail(res, 'Price and stock cannot be negative');
  }

  const medicine = await Medicine.create({
    pharmacyId: req.user.id,
    name: name.trim(),
    description: description?.trim() || '',
    price: Number(price),
    stock: Number(stock),
    requiresPrescription: !!requiresPrescription
  });

  return success(res, medicine, 201);
}

async function updateMedicine(req, res) {
  const { id } = req.params;
  const { name, description, price, stock, requiresPrescription } = req.body;

  if (!name?.trim() || price == null || stock == null) {
    return fail(res, 'Medicine name, price, and stock are required');
  }
  if (Number(price) < 0 || Number(stock) < 0) {
    return fail(res, 'Price and stock cannot be negative');
  }

  const medicine = await Medicine.findOneAndUpdate(
    { _id: id, pharmacyId: req.user.id },
    {
      name: name.trim(),
      description: description?.trim() || '',
      price: Number(price),
      stock: Number(stock),
      requiresPrescription: !!requiresPrescription
    },
    { new: true }
  );

  if (!medicine) return fail(res, 'Medicine not found', 404);

  return success(res, medicine);
}

async function updateStock(req, res) {
  const { id } = req.params;
  const { stock } = req.body;

  if (stock == null || Number(stock) < 0) {
    return fail(res, 'A valid stock quantity is required');
  }

  const medicine = await Medicine.findOneAndUpdate(
    { _id: id, pharmacyId: req.user.id },
    { stock: Number(stock) },
    { new: true }
  );

  if (!medicine) return fail(res, 'Medicine not found', 404);

  return success(res, medicine);
}

async function deleteMedicine(req, res) {
  const { id } = req.params;

  const medicine = await Medicine.findOneAndDelete({ _id: id, pharmacyId: req.user.id });
  if (!medicine) return fail(res, 'Medicine not found', 404);

  return success(res, { message: 'Medicine removed' });
}

async function resubmitApplication(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) {
    return fail(res, 'Account not found', 404);
  }

  if (user.verificationStatus !== 'rejected') {
    return fail(res, 'Only rejected applications can be resubmitted');
  }

  const { pharmacyName, drugLicenseNumber, city, lat, lng } = req.body;
  const doc = req.files?.document?.[0];

  if (!pharmacyName || !drugLicenseNumber || !city || !lat || !lng) {
    return fail(res, 'All fields are required to resubmit your application');
  }

  if (!doc) {
    return fail(res, 'Please re-upload your verification document');
  }

  const docUpload = await uploadBuffer(doc.buffer, 'pharmacies');

  try {
    await Pharmacy.findOneAndUpdate(
      { userId: req.user.id },
      {
        pharmacyName,
        drugLicenseNumberEncrypted: encrypt(drugLicenseNumber),
        drugLicenseNumberHash: hashForLookup(drugLicenseNumber),
        documentUrl: docUpload.url,
        documentPublicId: docUpload.publicId,
        city,
        location: { type: 'Point', coordinates: [Number(lng), Number(lat)] }
      },
      { runValidators: true }
    );
  } catch (err) {
    if (err.code === 11000) {
      return fail(res, 'This drug license number is already registered to another account', 409);
    }
    throw err;
  }

  user.verificationStatus = 'pending';
  user.rejectionReason = null;
  await user.save();

  return success(res, { message: 'Application resubmitted for review' });
}

module.exports = {
  getProfile: asyncHandler(getProfile),
  updateProfile: asyncHandler(updateProfile),
  listMyMedicines: asyncHandler(listMyMedicines),
  addMedicine: asyncHandler(addMedicine),
  updateMedicine: asyncHandler(updateMedicine),
  updateStock: asyncHandler(updateStock),
  deleteMedicine: asyncHandler(deleteMedicine),
  resubmitApplication: asyncHandler(resubmitApplication)
};