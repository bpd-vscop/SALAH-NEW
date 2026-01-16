const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { requireAuth, requireRole } = require('../middleware/auth');

// Public route - track visitor (no auth required)
router.post('/track', analyticsController.trackVisitor);

// Admin only - get analytics summary
router.get('/summary', requireAuth, requireRole(['super_admin', 'admin']), analyticsController.getAnalyticsSummary);

module.exports = router;
