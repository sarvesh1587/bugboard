const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const s = require('../validators/schemas');

router.use(protect, authorize('admin'));
router.get('/', ctrl.list);
router.patch('/:id/role', validate({ params: s.idParam, body: s.updateRole }), ctrl.updateRole);

module.exports = router;
