const User = require('../models/User');

const requireVerified = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = await User.findById(req.user.id)
      .select('verificationStatus role')
      .lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (
      user.role !== 'doctor' &&
      user.role !== 'hospital' &&
      user.role !== 'pharmacy' &&
      user.role !== 'lab' &&
      user.role !== 'ambulance'
    ) {
      return next();
    }

    if (user.verificationStatus !== 'verified') {
      return res.status(403).json({
        success: false,
        message: 'Your account must be verified before performing this action'
      });
    }

    req.user.verificationStatus = user.verificationStatus;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requireVerified
};