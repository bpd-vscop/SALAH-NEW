const express = require('express');

const {
  listConversations,
  listMessages,
  sendMessage,
  markConversationRead,
  listClients,
  composeConversations,
  sendMessageWithAttachments,
  composeConversationsWithAttachments,
} = require('../controllers/adminMessageController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { supportAttachmentsUpload } = require('../middleware/supportAttachments');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(['super_admin', 'admin', 'staff']));

router.get('/conversations', listConversations);
router.get('/clients', listClients);
router.get('/conversations/:id/messages', listMessages);
router.post('/conversations/:id/messages', sendMessage);
router.post('/conversations/:id/messages-with-attachments', supportAttachmentsUpload, sendMessageWithAttachments);
router.post('/conversations/:id/read', markConversationRead);
router.post('/compose', composeConversations);
router.post('/compose-with-attachments', supportAttachmentsUpload, composeConversationsWithAttachments);

module.exports = router;
