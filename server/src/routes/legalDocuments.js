const express = require('express');
const router = express.Router();
const legalDocumentController = require('../controllers/legalDocumentController');
const { requireAuth, requireRole } = require('../middleware/auth');

// Public routes
router.get('/', legalDocumentController.list);
router.get('/:type', legalDocumentController.getByType);

// Admin-only routes
router.put('/:type', requireAuth, requireRole(['super_admin', 'admin', 'staff']), legalDocumentController.update);

module.exports = router;
