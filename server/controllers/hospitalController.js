const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { encrypt, hashForLookup } = require('../utils/helpers');
const { uploadBuffer } = require('../services/cloudinaryService');
const { success, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

async function listDirectory(req, res) {
  const verifiedUserIds = await User.find({ role: 'hospital', verificationStatus: 'verified' }).select('_id');
  const ids = verifiedUserIds.map((u) => u._id);

  const hospitals = await Hospital.find({ userId: { $in: ids } }).select('userId hospitalName city');

  return success(
    res,
    hospitals.map((h) => ({ id: h.userId, hospitalName: h.hospitalName, city: h.city }))
  );
}

async function listDepartmentsForHospital(req, res) {
  const { hospitalUserId } = req.params;

  const hospital = await Hospital.findOne({ userId: hospitalUserId });
  if (!hospital) return success(res, []);

  return success(res, hospital.departments.map((d) => ({ id: d._id, name: d.name })));
}

async function listDepartments(req, res) {
  const hospital = await Hospital.findOne({ userId: req.user.id });
  if (!hospital) return success(res, []);

  const doctors = await Doctor.find({ hospitalId: req.user.id }).select('fullName departmentId');

  const results = hospital.departments.map((d) => {
    const deptDoctors = doctors.filter((doc) => doc.departmentId?.toString() === d._id.toString());
    const deptBeds = hospital.beds.filter((b) => b.departmentId?.toString() === d._id.toString());

    return {
      id: d._id,
      name: d.name,
      description: d.description,
      doctorCount: deptDoctors.length,
      doctorNames: deptDoctors.map((doc) => doc.fullName),
      totalBeds: deptBeds.reduce((sum, b) => sum + b.total, 0),
      availableBeds: deptBeds.reduce((sum, b) => sum + b.available, 0),
      hasBeds: deptBeds.length > 0
    };
  });

  return success(res, results);
}

async function addDepartment(req, res) {
  const { name, description } = req.body;
  if (!name?.trim()) {
    return fail(res, 'Department name is required');
  }

  const hospital = await Hospital.findOne({ userId: req.user.id });
  if (!hospital) return fail(res, 'Hospital profile not found', 404);

  hospital.departments.push({ name: name.trim(), description: description?.trim() || '' });
  await hospital.save();

  return success(res, { message: 'Department added' }, 201);
}

async function deleteDepartment(req, res) {
  const { id } = req.params;

  const hospital = await Hospital.findOne({ userId: req.user.id });
  if (!hospital) return fail(res, 'Hospital profile not found', 404);

  const department = hospital.departments.id(id);
  if (!department) return fail(res, 'Department not found', 404);

  department.deleteOne();

  hospital.beds.forEach((bed) => {
    if (bed.departmentId?.toString() === id) bed.departmentId = null;
  });

  await hospital.save();
  await Doctor.updateMany({ hospitalId: req.user.id, departmentId: id }, { departmentId: null });

  return success(res, { message: 'Department removed' });
}

async function listAffiliatedDoctors(req, res) {
  const hospital = await Hospital.findOne({ userId: req.user.id });
  const departmentLookup = new Map((hospital?.departments || []).map((d) => [d._id.toString(), d.name]));

  const doctors = await Doctor.find({ hospitalId: req.user.id }).populate('userId', 'email verificationStatus');

  return success(
    res,
    doctors.map((doc) => ({
      userId: doc.userId._id,
      fullName: doc.fullName,
      email: doc.userId.email,
      specialization: doc.specialization,
      verificationStatus: doc.userId.verificationStatus,
      departmentName: doc.departmentId ? departmentLookup.get(doc.departmentId.toString()) || null : null
    }))
  );
}

async function removeDoctorAffiliation(req, res) {
  const { doctorUserId } = req.params;

  const doctor = await Doctor.findOne({ userId: doctorUserId, hospitalId: req.user.id });
  if (!doctor) {
    return fail(res, 'This doctor is not affiliated with your hospital', 404);
  }

  doctor.hospitalId = null;
  doctor.departmentId = null;
  await doctor.save();

  return success(res, { message: 'Doctor removed from your hospital' });
}

async function listHospitalAppointments(req, res) {
  const appointments = await Appointment.find({ hospitalId: req.user.id, visitLocation: 'hospital' })
    .sort({ date: 1 })
    .populate('patientId', 'email');

  const results = await Promise.all(
    appointments.map(async (appt) => {
      const doctorRecord = await Doctor.findOne({ userId: appt.doctorId });
      return {
        id: appt._id,
        date: appt.date,
        timeSlot: appt.timeSlot,
        status: appt.status,
        doctorName: doctorRecord?.fullName || 'Unknown doctor',
        doctorSpecialization: doctorRecord?.specialization || '',
        patientEmail: appt.patientId?.email || 'Unknown patient'
      };
    })
  );

  return success(res, results);
}

async function listBeds(req, res) {
  const hospital = await Hospital.findOne({ userId: req.user.id });
  if (!hospital) return success(res, []);

  const departmentLookup = new Map(hospital.departments.map((d) => [d._id.toString(), d.name]));

  return success(
    res,
    hospital.beds.map((b) => ({
      id: b._id,
      category: b.category,
      total: b.total,
      available: b.available,
      departmentId: b.departmentId,
      departmentName: b.departmentId ? departmentLookup.get(b.departmentId.toString()) || null : null
    }))
  );
}

async function addBedCategory(req, res) {
  const { category, total, available, departmentId } = req.body;

  if (!category?.trim() || total == null || available == null) {
    return fail(res, 'Category, total, and available beds are required');
  }
  if (Number(available) > Number(total)) {
    return fail(res, 'Available beds cannot exceed total beds');
  }

  const hospital = await Hospital.findOne({ userId: req.user.id });
  if (!hospital) return fail(res, 'Hospital profile not found', 404);

  if (departmentId && !hospital.departments.id(departmentId)) {
    return fail(res, 'Select a valid department');
  }

  hospital.beds.push({
    category: category.trim(),
    total: Number(total),
    available: Number(available),
    departmentId: departmentId || null
  });
  await hospital.save();

  return success(res, { message: 'Bed category added' }, 201);
}

async function updateBedCategory(req, res) {
  const { id } = req.params;
  const { total, available } = req.body;

  if (total == null || available == null) {
    return fail(res, 'Total and available beds are required');
  }
  if (Number(available) > Number(total)) {
    return fail(res, 'Available beds cannot exceed total beds');
  }

  const hospital = await Hospital.findOne({ userId: req.user.id });
  if (!hospital) return fail(res, 'Hospital profile not found', 404);

  const bedCategory = hospital.beds.id(id);
  if (!bedCategory) return fail(res, 'Bed category not found', 404);

  bedCategory.total = Number(total);
  bedCategory.available = Number(available);
  await hospital.save();

  return success(res, { message: 'Bed availability updated' });
}

async function deleteBedCategory(req, res) {
  const { id } = req.params;

  const hospital = await Hospital.findOne({ userId: req.user.id });
  if (!hospital) return fail(res, 'Hospital profile not found', 404);

  const bedCategory = hospital.beds.id(id);
  if (!bedCategory) return fail(res, 'Bed category not found', 404);

  bedCategory.deleteOne();
  await hospital.save();

  return success(res, { message: 'Bed category removed' });
}

async function resubmitApplication(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) {
    return fail(res, 'Account not found', 404);
  }

  if (user.verificationStatus !== 'rejected') {
    return fail(res, 'Only rejected applications can be resubmitted');
  }

  const { hospitalName, address, licenseNumber, city, lat, lng } = req.body;
  const doc1 = req.files?.document1?.[0];
  const doc2 = req.files?.document2?.[0];

  if (!hospitalName || !address || !licenseNumber || !city || !lat || !lng) {
    return fail(res, 'All fields are required to resubmit your application');
  }

  if (!doc1 || !doc2) {
    return fail(res, 'Please re-upload both verification documents');
  }

  const [upload1, upload2] = await Promise.all([
    uploadBuffer(doc1.buffer, 'hospitals'),
    uploadBuffer(doc2.buffer, 'hospitals')
  ]);

  try {
    await Hospital.findOneAndUpdate(
      { userId: req.user.id },
      {
        hospitalName,
        address,
        licenseNumberEncrypted: encrypt(licenseNumber),
        licenseNumberHash: hashForLookup(licenseNumber),
        documentUrls: [upload1.url, upload2.url],
        documentPublicIds: [upload1.publicId, upload2.publicId],
        city,
        location: { type: 'Point', coordinates: [Number(lng), Number(lat)] }
      },
      { runValidators: true }
    );
  } catch (err) {
    if (err.code === 11000) {
      return fail(res, 'This license number is already registered to another account', 409);
    }
    throw err;
  }

  user.verificationStatus = 'pending';
  user.rejectionReason = null;
  await user.save();

  return success(res, { message: 'Application resubmitted for review' });
}

module.exports = {
  listDirectory: asyncHandler(listDirectory),
  listDepartmentsForHospital: asyncHandler(listDepartmentsForHospital),
  listDepartments: asyncHandler(listDepartments),
  addDepartment: asyncHandler(addDepartment),
  deleteDepartment: asyncHandler(deleteDepartment),
  listAffiliatedDoctors: asyncHandler(listAffiliatedDoctors),
  removeDoctorAffiliation: asyncHandler(removeDoctorAffiliation),
  listHospitalAppointments: asyncHandler(listHospitalAppointments),
  listBeds: asyncHandler(listBeds),
  addBedCategory: asyncHandler(addBedCategory),
  updateBedCategory: asyncHandler(updateBedCategory),
  deleteBedCategory: asyncHandler(deleteBedCategory),
  resubmitApplication: asyncHandler(resubmitApplication)
};