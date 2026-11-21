const router = require('express').Router();
const ctrl = require('../controllers/project.controller');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const s = require('../validators/schemas');

router.use(protect);
router.get('/', ctrl.list);
router.get('/:id', validate({ params: s.idParam }), ctrl.get);
router.post('/', authorize('admin'), validate({ body: s.createProject }), ctrl.create);
router.patch('/:id', authorize('admin'), validate({ params: s.idParam, body: s.updateProject }), ctrl.update);

module.exports = router;
