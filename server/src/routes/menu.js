const express = require('express');
const { getMenu, updateMenu } = require('../controllers/menuController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', getMenu);
router.put('/', requireAuth, requireRole(['admin', 'manager']), updateMenu);

module.exports = router;

