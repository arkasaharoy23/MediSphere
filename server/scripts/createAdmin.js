const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const connectDB = require('../config/db');
const User = require('../models/User');
const { encrypt, hashForLookup } = require('../utils/helpers');

async function run() {
  const [, , firebaseUid, email, phone] = process.argv;

  if (!firebaseUid || !email || !phone) {
    console.log('Usage: node scripts/createAdmin.js <firebaseUid> <email> <phone>');
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ firebaseUid });
  if (existing) {
    console.log('A PulseLink account already exists for this Firebase user.');
    process.exit(1);
  }

  const admin = await User.create({
    firebaseUid,
    email,
    phoneEncrypted: encrypt(phone),
    phoneHash: hashForLookup(phone),
    role: 'admin',
    verificationStatus: 'verified',
    isActive: true
  });

  console.log(`Admin account created for ${admin.email}`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed to create admin:', err);
  process.exit(1);
});