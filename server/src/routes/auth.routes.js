const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const s = require('../validators/schemas');

// Brute-force protection on credential endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, message: 'Too many attempts, please try again later' },
});

router.post('/register', authLimiter, validate({ body: s.register }), ctrl.register);
router.post('/login', authLimiter, validate({ body: s.login }), ctrl.login);
router.get('/me', protect, ctrl.me);

module.exports = router;
