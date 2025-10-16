const express = require('express');
const {
  listCategories,
  createCategory,
  updateCategory,
  getCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', listCategories);
router.get('/:id', getCategory);
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'staff']), createCategory);
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'staff']), updateCategory);
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin']), deleteCategory);

module.exports = router;
