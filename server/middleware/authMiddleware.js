const admin = require('../config/firebase');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const Lab = require('../models/Lab');
const Pharmacy = require('../models/Pharmacy');
const Ambulance = require('../models/Ambulance');
const Patient = require('../models/Patient');
const asyncHandler = require('../utils/asyncHandler');

const ROLE_MODELS = { doctor: Doctor, hospital: Hospital, lab: Lab, pharmacy: Pharmacy, ambulance: Ambulance, patient: Patient };
const NAME_FIELDS = {
  doctor: 'fullName',
  hospital: 'hospitalName',
  lab: 'labName',
  pharmacy: 'pharmacyName',
  ambulance: 'driverName',
  patient: 'fullName'
};

async function resolveDisplayName(role, userId, email) {
  const Model = ROLE_MODELS[role];
  if (!Model) return email;

  const record = await Model.findOne({ userId });
  if (!record) return email;

  return record[NAME_FIELDS[role]] || email;
}

async function protectHandler(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, message: 'No token provided' });
  }

  const idToken = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Invalid or expired session, please log in again' });
  }

  const user = await User.findOne({ firebaseUid: decoded.uid });
  if (!user) {
    return res.status(404).json({ ok: false, message: 'No MediSphere account found for this login' });
  }

  if (!user.isActive) {
    return res.status(403).json({ ok: false, message: 'Your account has been suspended. Please contact support.' });
  }

  const displayName = await resolveDisplayName(user.role, user._id, user.email);

  req.user = {
    id: user._id,
    firebaseUid: user.firebaseUid,
    email: user.email,
    role: user.role,
    displayName,
    profilePicUrl: user.profilePicUrl,
    verificationStatus: user.verificationStatus
  };

  next();
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, message: 'You do not have access to this resource' });
    }
    next();
  };
}

function requireVerified(req, res, next) {
  if (!req.user || req.user.verificationStatus !== 'verified') {
    return res.status(403).json({ ok: false, message: 'Your account is still pending verification' });
  }
  next();
}

const protect = asyncHandler(protectHandler);

module.exports = { protect, authorizeRoles, requireVerified };