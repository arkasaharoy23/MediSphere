const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
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

async function listDepartments(req, res) {
  const hospital = await Hospital.findOne({ userId: req.user.id });
  if (!hospital) return success(res, []);

  return success(res, hospital.departments.map((d) => ({ id: d._id, name: d.name, description: d.description })));
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
  await hospital.save();

  return success(res, { message: 'Department removed' });
}

async function listAffiliatedDoctors(req, res) {
  const doctors = await Doctor.find({ hospitalId: req.user.id }).populate('userId', 'email verificationStatus');

  return success(
    res,
    doctors.map((doc) => ({
      userId: doc.userId._id,
      fullName: doc.fullName,
      email: doc.userId.email,
      specialization: doc.specialization,
      verificationStatus: doc.userId.verificationStatus
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
  await doctor.save();

  return success(res, { message: 'Doctor removed from your hospital' });
}

async function listHospitalAppointments(req, res) {
  const affiliatedDoctors = await Doctor.find({ hospitalId: req.user.id }).select('userId fullName specialization');
  const doctorIds = affiliatedDoctors.map((d) => d.userId);

  if (doctorIds.length === 0) {
    return success(res, []);
  }

  const doctorLookup = new Map(affiliatedDoctors.map((d) => [d.userId.toString(), d]));

  const appointments = await Appointment.find({ doctorId: { $in: doctorIds } })
    .sort({ date: 1 })
    .populate('patientId', 'email');

  const results = appointments.map((appt) => {
    const doctorRecord = doctorLookup.get(appt.doctorId.toString());
    return {
      id: appt._id,
      date: appt.date,
      timeSlot: appt.timeSlot,
      status: appt.status,
      doctorName: doctorRecord?.fullName || 'Unknown doctor',
      doctorSpecialization: doctorRecord?.specialization || '',
      patientEmail: appt.patientId?.email || 'Unknown patient'
    };
  });

  return success(res, results);
}

async function listBeds(req, res) {
  const hospital = await Hospital.findOne({ userId: req.user.id });
  if (!hospital) return success(res, []);

  return success(
    res,
    hospital.beds.map((b) => ({ id: b._id, category: b.category, total: b.total, available: b.available }))
  );
}

async function addBedCategory(req, res) {
  const { category, total, available } = req.body;

  if (!category?.trim() || total == null || available == null) {
    return fail(res, 'Category, total, and available beds are required');
  }
  if (Number(available) > Number(total)) {
    return fail(res, 'Available beds cannot exceed total beds');
  }

  const hospital = await Hospital.findOne({ userId: req.user.id });
  if (!hospital) return fail(res, 'Hospital profile not found', 404);

  hospital.beds.push({ category: category.trim(), total: Number(total), available: Number(available) });
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

module.exports = {
  listDirectory: asyncHandler(listDirectory),
  listDepartments: asyncHandler(listDepartments),
  addDepartment: asyncHandler(addDepartment),
  deleteDepartment: asyncHandler(deleteDepartment),
  listAffiliatedDoctors: asyncHandler(listAffiliatedDoctors),
  removeDoctorAffiliation: asyncHandler(removeDoctorAffiliation),
  listHospitalAppointments: asyncHandler(listHospitalAppointments),
  listBeds: asyncHandler(listBeds),
  addBedCategory: asyncHandler(addBedCategory),
  updateBedCategory: asyncHandler(updateBedCategory),
  deleteBedCategory: asyncHandler(deleteBedCategory)
};