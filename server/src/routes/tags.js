const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  listTags,
  createTag,
  updateTag,
  deleteTag,
} = require('../controllers/tagController');

const router = express.Router();

router.get('/', listTags);
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), createTag);
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), updateTag);
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin', 'manager']), deleteTag);

module.exports = router;
