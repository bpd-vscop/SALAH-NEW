const express = require('express');

const {
  listConversations,
  createConversation,
  listMessages,
  sendMessage,
  markConversationRead,
  pingPresence,
} = require('../controllers/messageController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(['client']));

router.get('/conversations', listConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:id/messages', listMessages);
router.post('/conversations/:id/messages', sendMessage);
router.post('/conversations/:id/read', markConversationRead);
router.post('/conversations/:id/presence', pingPresence);

module.exports = router;
