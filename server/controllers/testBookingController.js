const TestBooking = require('../models/TestBooking');
const LabTest = require('../models/LabTest');
const Lab = require('../models/Lab');
const User = require('../models/User');
const { uploadBuffer, getSignedViewUrl } = require('../services/cloudinaryService');
const { success, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

async function createBooking(req, res) {
  const { labId, testId, preferredDate } = req.body;

  if (!labId || !testId || !preferredDate) {
    return fail(res, 'labId, testId, and preferredDate are required');
  }

  if (new Date(preferredDate) < new Date().setHours(0, 0, 0, 0)) {
    return fail(res, 'Preferred date cannot be in the past');
  }

  const labUser = await User.findOne({ _id: labId, role: 'lab', verificationStatus: 'verified' });
  if (!labUser) {
    return fail(res, 'Selected lab is not available for booking', 404);
  }

  const test = await LabTest.findOne({ _id: testId, labId });
  if (!test) {
    return fail(res, 'Selected test is not offered by this lab', 404);
  }

  const booking = await TestBooking.create({
    patientId: req.user.id,
    labId,
    testId,
    testName: test.name,
    price: test.price,
    preferredDate
  });

  return success(res, booking, 201);
}

async function listMine(req, res) {
  const isLab = req.user.role === 'lab';
  const filter = isLab ? { labId: req.user.id } : { patientId: req.user.id };

  const bookings = await TestBooking.find(filter).sort({ preferredDate: 1 });

  const results = await Promise.all(
    bookings.map(async (booking) => {
      let labName;
      let patientEmail;

      if (isLab) {
        const patientUser = await User.findById(booking.patientId);
        patientEmail = patientUser?.email || 'Unknown patient';
      } else {
        const labRecord = await Lab.findOne({ userId: booking.labId });
        labName = labRecord?.labName || 'Unknown lab';
      }

      return {
        id: booking._id,
        testName: booking.testName,
        price: booking.price,
        preferredDate: booking.preferredDate,
        status: booking.status,
        labName,
        patientEmail,
        reportViewUrl: booking.reportPublicId ? getSignedViewUrl(booking.reportPublicId) : null
      };
    })
  );

  return success(res, results);
}

async function cancelBooking(req, res) {
  const { id } = req.params;

  const booking = await TestBooking.findById(id);
  if (!booking) return fail(res, 'Booking not found', 404);

  if (booking.patientId.toString() !== req.user.id.toString()) {
    return fail(res, 'You do not have access to this booking', 403);
  }

  if (['completed', 'cancelled'].includes(booking.status)) {
    return fail(res, 'This booking can no longer be cancelled');
  }

  booking.status = 'cancelled';
  await booking.save();

  return success(res, { id: booking._id, status: booking.status });
}

async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ['sample_collected', 'processing'];
  if (!allowed.includes(status)) {
    return fail(res, `status must be one of: ${allowed.join(', ')}`);
  }

  const booking = await TestBooking.findById(id);
  if (!booking) return fail(res, 'Booking not found', 404);

  if (booking.labId.toString() !== req.user.id.toString()) {
    return fail(res, 'You do not have access to this booking', 403);
  }

  if (['completed', 'cancelled'].includes(booking.status)) {
    return fail(res, 'This booking has already been finalized');
  }

  booking.status = status;
  await booking.save();

  return success(res, { id: booking._id, status: booking.status });
}

async function uploadReport(req, res) {
  const { id } = req.params;
  const file = req.files?.testReport?.[0];

  if (!file) {
    return fail(res, 'Please attach the report as a PDF');
  }

  const booking = await TestBooking.findById(id);
  if (!booking) return fail(res, 'Booking not found', 404);

  if (booking.labId.toString() !== req.user.id.toString()) {
    return fail(res, 'You do not have access to this booking', 403);
  }

  if (['completed', 'cancelled'].includes(booking.status)) {
    return fail(res, 'This booking has already been finalized');
  }

  const upload = await uploadBuffer(file.buffer, 'lab-reports');

  booking.reportUrl = upload.url;
  booking.reportPublicId = upload.publicId;
  booking.status = 'completed';
  await booking.save();

  return success(res, { message: 'Report uploaded, booking marked complete' });
}

module.exports = {
  createBooking: asyncHandler(createBooking),
  listMine: asyncHandler(listMine),
  cancelBooking: asyncHandler(cancelBooking),
  updateStatus: asyncHandler(updateStatus),
  uploadReport: asyncHandler(uploadReport)
};