const express = require('express');
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', listCategories);
router.post('/', requireAuth, requireRole(['admin', 'manager', 'staff']), createCategory);
router.put('/:id', requireAuth, requireRole(['admin', 'manager', 'staff']), updateCategory);
router.delete('/:id', requireAuth, requireRole(['admin', 'manager']), deleteCategory);

module.exports = router;
