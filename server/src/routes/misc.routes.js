const router = require('express').Router();
const dashboard = require('../controllers/dashboard.controller');
const notifications = require('../controllers/notification.controller');
const comments = require('../controllers/comment.controller');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const s = require('../validators/schemas');

router.use(protect);

router.get('/dashboard', dashboard.summary);

router.get('/notifications', notifications.list);
router.patch('/notifications/read-all', notifications.markAllRead);
router.patch('/notifications/:id/read', validate({ params: s.idParam }), notifications.markRead);

router.delete('/comments/:id', validate({ params: s.idParam }), comments.remove);

module.exports = router;
