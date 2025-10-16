const express = require('express');
const { getCategoryDisplay, updateCategoryDisplay } = require('../controllers/categoryDisplayController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', getCategoryDisplay);
router.put('/', requireAuth, requireRole(['super_admin', 'admin', 'staff']), updateCategoryDisplay);

module.exports = router;
