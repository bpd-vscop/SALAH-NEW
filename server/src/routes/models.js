const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  listModels,
  createModel,
  updateModel,
  deleteModel,
} = require('../controllers/modelController');

const router = express.Router();

router.get('/', listModels);
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), createModel);
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), updateModel);
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin', 'manager']), deleteModel);

module.exports = router;
