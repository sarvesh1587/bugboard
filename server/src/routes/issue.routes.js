const router = require('express').Router();
const { z } = require('zod');
const ctrl = require('../controllers/issue.controller');
const comments = require('../controllers/comment.controller');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const s = require('../validators/schemas');

const id = { params: s.idParam };

router.use(protect);

router.get('/', validate({ query: s.listIssues }), ctrl.list);
router.post('/', validate({ body: s.createIssue }), ctrl.create);

router.get('/:id', validate(id), ctrl.get);
router.patch('/:id', validate({ ...id, body: s.updateIssue }), ctrl.update);
router.delete('/:id', authorize('admin'), validate(id), ctrl.remove);

router.patch('/:id/status', validate({ ...id, body: s.changeStatus }), ctrl.changeStatus);
router.patch('/:id/assign', validate({ ...id, body: s.assign }), ctrl.assign);

router.post('/:id/attachments', validate(id), upload.array('files', 5), ctrl.addAttachments);
router.delete(
  '/:id/attachments/:attachmentId',
  validate({ params: z.object({ id: s.objectId, attachmentId: s.objectId }) }),
  ctrl.removeAttachment
);

router.get('/:id/activity', validate(id), ctrl.activity);
router.get('/:id/comments', validate(id), comments.list);
router.post('/:id/comments', validate({ ...id, body: s.comment }), comments.create);

module.exports = router;
