const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const Lab = require('../models/Lab');
const LabTest = require('../models/LabTest');
const Pharmacy = require('../models/Pharmacy');
const Medicine = require('../models/Medicine');
const User = require('../models/User');
const { encrypt, decrypt } = require('../utils/helpers');
const { success, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

async function getProfile(req, res) {
  const record = await Patient.findOne({ userId: req.user.id });

  if (!record) {
    return success(res, null);
  }

  return success(res, {
    fullName: record.fullName,
    dateOfBirth: record.dateOfBirth,
    gender: record.gender,
    bloodGroup: record.bloodGroup,
    address: record.address,
    emergencyContactName: record.emergencyContactName,
    emergencyContactPhone: record.emergencyContactPhoneEncrypted
      ? decrypt(record.emergencyContactPhoneEncrypted)
      : ''
  });
}

async function updateProfile(req, res) {
  const { fullName, dateOfBirth, gender, bloodGroup, address, emergencyContactName, emergencyContactPhone } = req.body;

  if (!fullName || !dateOfBirth || !gender) {
    return fail(res, 'Full name, date of birth, and gender are required');
  }

  const update = {
    userId: req.user.id,
    fullName,
    dateOfBirth,
    gender,
    bloodGroup: bloodGroup || 'unknown',
    address: address || '',
    emergencyContactName: emergencyContactName || '',
    emergencyContactPhoneEncrypted: emergencyContactPhone ? encrypt(emergencyContactPhone) : null
  };

  await Patient.findOneAndUpdate(
    { userId: req.user.id },
    update,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return success(res, { message: 'Profile updated' });
}

async function listDoctors(req, res) {
  const { lat, lng, maxDistanceKm } = req.query;

  const doctorUsers = await User.find({ role: 'doctor', verificationStatus: 'verified' });
  const verifiedIds = doctorUsers.map((u) => u._id);

  let doctorRecords;
  let locationFiltered = false;

  if (lat && lng) {
    const radiusMeters = (Number(maxDistanceKm) || 25) * 1000;
    doctorRecords = await Doctor.find({
      userId: { $in: verifiedIds },
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          $maxDistance: radiusMeters
        }
      }
    });
    locationFiltered = true;
  } else {
    doctorRecords = await Doctor.find({ userId: { $in: verifiedIds } });
  }

  const results = await Promise.all(
    doctorRecords.map(async (record) => {
      let hospitalName = null;
      if (record.hospitalId) {
        const hospitalRecord = await Hospital.findOne({ userId: record.hospitalId });
        hospitalName = hospitalRecord?.hospitalName || null;
      }

      return {
        doctorId: record.userId,
        fullName: record.fullName,
        specialization: record.specialization,
        city: record.city,
        hospitalId: record.hospitalId || null,
        hospitalName
      };
    })
  );

  return success(res, { doctors: results, locationFiltered });
}

async function listHospitals(req, res) {
  const { lat, lng } = req.query;

  const hospitalUsers = await User.find({ role: 'hospital', verificationStatus: 'verified' });
  const verifiedIds = hospitalUsers.map((u) => u._id);

  let hospitalRecords;
  let locationSorted = false;

  if (lat && lng) {
    hospitalRecords = await Hospital.find({
      userId: { $in: verifiedIds },
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] }
        }
      }
    });
    locationSorted = true;
  } else {
    hospitalRecords = await Hospital.find({ userId: { $in: verifiedIds } });
  }

  const results = hospitalRecords.map((record) => ({
    hospitalId: record.userId,
    hospitalName: record.hospitalName,
    address: record.address,
    city: record.city
  }));

  return success(res, { hospitals: results, locationSorted });
}

async function listLabs(req, res) {
  const { lat, lng } = req.query;

  const labUsers = await User.find({ role: 'lab', verificationStatus: 'verified' });
  const verifiedIds = labUsers.map((u) => u._id);

  let labRecords;
  let locationSorted = false;

  if (lat && lng) {
    labRecords = await Lab.find({
      userId: { $in: verifiedIds },
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] }
        }
      }
    });
    locationSorted = true;
  } else {
    labRecords = await Lab.find({ userId: { $in: verifiedIds } });
  }

  const results = labRecords.map((record) => ({
    labId: record.userId,
    labName: record.labName,
    city: record.city
  }));

  return success(res, { labs: results, locationSorted });
}

async function listLabTests(req, res) {
  const { labId } = req.params;

  const labUser = await User.findOne({ _id: labId, role: 'lab', verificationStatus: 'verified' });
  if (!labUser) {
    return fail(res, 'Lab not found', 404);
  }

  const tests = await LabTest.find({ labId }).sort({ name: 1 });

  return success(res, tests);
}

async function listPharmacies(req, res) {
  const { lat, lng } = req.query;

  const pharmacyUsers = await User.find({ role: 'pharmacy', verificationStatus: 'verified' });
  const verifiedIds = pharmacyUsers.map((u) => u._id);

  let pharmacyRecords;
  let locationSorted = false;

  if (lat && lng) {
    pharmacyRecords = await Pharmacy.find({
      userId: { $in: verifiedIds },
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] }
        }
      }
    });
    locationSorted = true;
  } else {
    pharmacyRecords = await Pharmacy.find({ userId: { $in: verifiedIds } });
  }

  const results = pharmacyRecords.map((record) => ({
    pharmacyId: record.userId,
    pharmacyName: record.pharmacyName,
    city: record.city
  }));

  return success(res, { pharmacies: results, locationSorted });
}

async function listPharmacyMedicines(req, res) {
  const { pharmacyId } = req.params;

  const pharmacyUser = await User.findOne({ _id: pharmacyId, role: 'pharmacy', verificationStatus: 'verified' });
  if (!pharmacyUser) {
    return fail(res, 'Pharmacy not found', 404);
  }

  const medicines = await Medicine.find({ pharmacyId, stock: { $gt: 0 } }).sort({ name: 1 });

  return success(res, medicines);
}

module.exports = {
  getProfile: asyncHandler(getProfile),
  updateProfile: asyncHandler(updateProfile),
  listDoctors: asyncHandler(listDoctors),
  listHospitals: asyncHandler(listHospitals),
  listLabs: asyncHandler(listLabs),
  listLabTests: asyncHandler(listLabTests),
  listPharmacies: asyncHandler(listPharmacies),
  listPharmacyMedicines: asyncHandler(listPharmacyMedicines)
};