const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

const signToken = (user) => jwt.sign({ sub: user._id.toString(), role: user.role }, jwtSecret, { expiresIn: jwtExpiresIn });

// POST /api/auth/register
exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists');

  const user = await User.create({ name, email, password, role });
  res.status(201).json({ success: true, token: signToken(user), user });
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  // Same message for both cases so emails can't be enumerated
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  res.json({ success: true, token: signToken(user), user });
};

// GET /api/auth/me
exports.me = async (req, res) => {
  res.json({ success: true, user: req.user });
};
