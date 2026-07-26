const admin = require('../config/firebase');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const Lab = require('../models/Lab');
const Pharmacy = require('../models/Pharmacy');
const Ambulance = require('../models/Ambulance');
const { encrypt, hashForLookup } = require('../utils/helpers');
const { uploadBuffer } = require('../services/cloudinaryService');
const { success, fail } = require('../utils/response');
const { isValidIndianPhone } = require('../utils/validators');
const asyncHandler = require('../utils/asyncHandler');

async function createRoleRecord(role, userId, body, files) {
  if (role === 'doctor') {
    const cert = files?.registrationCertificate?.[0];
    if (!cert) throw new Error('Registration certificate is required');
    const certUpload = await uploadBuffer(cert.buffer, 'doctors');
    return Doctor.create({
      userId,
      fullName: body.fullName,
      specialization: body.specialization,
      registrationNumberEncrypted: encrypt(body.registrationNumber),
      registrationNumberHash: hashForLookup(body.registrationNumber),
      registrationCertificateUrl: certUpload.url,
      registrationCertificatePublicId: certUpload.publicId
    });
  }

  if (role === 'hospital') {
    const doc1 = files?.document1?.[0];
    const doc2 = files?.document2?.[0];
    if (!doc1 || !doc2) throw new Error('Two verification documents are required');
    const [upload1, upload2] = await Promise.all([
      uploadBuffer(doc1.buffer, 'hospitals'),
      uploadBuffer(doc2.buffer, 'hospitals')
    ]);
    return Hospital.create({
      userId,
      hospitalName: body.hospitalName,
      address: body.address,
      licenseNumberEncrypted: encrypt(body.licenseNumber),
      licenseNumberHash: hashForLookup(body.licenseNumber),
      documentUrls: [upload1.url, upload2.url],
      documentPublicIds: [upload1.publicId, upload2.publicId]
    });
  }

  if (role === 'lab') {
    const doc = files?.document?.[0];
    if (!doc) throw new Error('A verification document is required');
    const docUpload = await uploadBuffer(doc.buffer, 'labs');
    return Lab.create({
      userId,
      labName: body.labName,
      licenseNumberEncrypted: encrypt(body.licenseNumber),
      licenseNumberHash: hashForLookup(body.licenseNumber),
      documentUrl: docUpload.url,
      documentPublicId: docUpload.publicId
    });
  }

  if (role === 'pharmacy') {
    const doc = files?.document?.[0];
    if (!doc) throw new Error('A verification document is required');
    const docUpload = await uploadBuffer(doc.buffer, 'pharmacies');
    return Pharmacy.create({
      userId,
      pharmacyName: body.pharmacyName,
      drugLicenseNumberEncrypted: encrypt(body.drugLicenseNumber),
      drugLicenseNumberHash: hashForLookup(body.drugLicenseNumber),
      documentUrl: docUpload.url,
      documentPublicId: docUpload.publicId
    });
  }

  if (role === 'ambulance') {
    const rc = files?.rcDocument?.[0];
    const licenseDoc = files?.driverLicenseDoc?.[0];
    const photo = files?.driverPhoto?.[0];
    const idDoc = files?.driverIdDoc?.[0];
    const permit = files?.permitDocument?.[0];
    if (!rc || !licenseDoc || !photo || !idDoc || !permit) {
      throw new Error('All ambulance documents are required');
    }
    const [rcUpload, licenseUpload, photoUpload, idUpload, permitUpload] =
      await Promise.all([
        uploadBuffer(rc.buffer, 'ambulances'),
        uploadBuffer(licenseDoc.buffer, 'ambulances'),
        uploadBuffer(photo.buffer, 'ambulances'),
        uploadBuffer(idDoc.buffer, 'ambulances'),
        uploadBuffer(permit.buffer, 'ambulances')
      ]);
    return Ambulance.create({
      userId,
      vehicleNumber: body.vehicleNumber,
      rcDocumentUrl: rcUpload.url,
      rcDocumentPublicId: rcUpload.publicId,
      driverName: body.driverName,
      driverLicenseNumberEncrypted: encrypt(body.driverLicenseNumber),
      driverLicenseNumberHash: hashForLookup(body.driverLicenseNumber),
      driverLicenseDocUrl: licenseUpload.url,
      driverLicenseDocPublicId: licenseUpload.publicId,
      driverPhotoUrl: photoUpload.url,
      driverPhotoPublicId: photoUpload.publicId,
      driverIdDocUrl: idUpload.url,
      driverIdDocPublicId: idUpload.publicId,
      permitDocumentUrl: permitUpload.url,
      permitDocumentPublicId: permitUpload.publicId
    });
  }

  return null;
}

async function register(req, res) {
  const { idToken, role, phone } = req.body;

  if (!idToken || !role || !phone) {
    return fail(res, 'idToken, role, and phone are required');
  }

  if (!isValidIndianPhone(phone)) {
    return fail(res, 'Enter a valid Indian mobile number');
  }

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    return fail(res, 'Invalid or expired session, please sign in again', 401);
  }

  const existing = await User.findOne({ firebaseUid: decoded.uid });
  if (existing) {
    return fail(res, 'An account already exists for this login', 409);
  }

  let profilePicUrl = null;
  if (req.files?.profilePic?.[0]) {
    const picUpload = await uploadBuffer(req.files.profilePic[0].buffer, 'profiles', false);
    profilePicUrl = picUpload.url;
  }

  let user;
  try {
    user = await User.create({
      firebaseUid: decoded.uid,
      email: decoded.email,
      phoneEncrypted: encrypt(phone),
      phoneHash: hashForLookup(phone),
      role,
      profilePicUrl,
      verificationStatus: role === 'patient' ? 'verified' : 'pending'
    });

    await createRoleRecord(role, user._id, req.body, req.files);
  } catch (err) {
    console.error('Registration failed:', err);
    if (user) await User.deleteOne({ _id: user._id });
    if (err.code === 11000) {
      return fail(res, 'One of these details is already registered', 409);
    }
    return fail(res, err.message || 'Registration failed', 400);
  }

  return success(res, { role: user.role, verificationStatus: user.verificationStatus }, 201);
}

async function login(req, res) {
  const { idToken } = req.body;

  if (!idToken) {
    return fail(res, 'idToken is required');
  }

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    return fail(res, 'Invalid or expired session, please sign in again', 401);
  }

  const user = await User.findOne({ firebaseUid: decoded.uid });
  if (!user) {
    return fail(res, 'No PulseLink account found for this login, please register first', 404);
  }

  if (!user.isActive) {
    return fail(res, 'Your account has been suspended. Please contact support.', 403);
  }

  return success(res, { role: user.role, verificationStatus: user.verificationStatus });
}

module.exports = { register: asyncHandler(register), login: asyncHandler(login) };