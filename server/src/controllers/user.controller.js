const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/users  (admin) — used to pick project members
exports.list = async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const users = await User.find(filter).sort({ name: 1 }).limit(200);
  res.json({ success: true, users });
};

// PATCH /api/users/:id/role  (admin)
exports.updateRole = async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    throw ApiError.badRequest('You cannot change your own role');
  }
  const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { returnDocument: 'after', runValidators: true });
  if (!user) throw ApiError.notFound('User not found');
  res.json({ success: true, user });
};
