const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { jwtSecret } = require('../config/env');

/** Verifies the Bearer token and attaches the fresh user document to req.user */
async function protect(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  // Re-read the user so role changes / deletions take effect immediately
  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('User no longer exists');

  req.user = user;
  next();
}

/** Role gate, e.g. authorize('admin') */
const authorize = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) throw ApiError.forbidden();
  next();
};

module.exports = { protect, authorize };
