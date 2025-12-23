const mongoose = require('mongoose');

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { badRequest, notFound, forbidden } = require('../utils/appError');
const { validateCreateConversation, validateSendMessage, validateListQuery } = require('../validators/messages');
const { sendSupportClientMessageEmailToAdmin } = require('../services/emailService');

const getAllowedRecipients = () => {
  const raw = process.env.CONTACT_RECIPIENT_EMAILS || process.env.CONTACT_RECIPIENTS || '';
  const list = raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (list.length > 0) {
    return list;
  }

  return ['sales@ulk-supply.com', 'ulksupply@hotmail.com', 'bprod.digital@gmail.com'].map((email) => email.toLowerCase());
};

const listConversations = async (req, res, next) => {
  try {
    const limit = 50;
    const clientId = req.user._id;

    const conversations = await Conversation.aggregate([
      { $match: { clientId } },
      { $sort: { lastMessageAt: -1, updatedAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'messages',
          let: { convId: '$_id', lastReadAt: '$lastReadAtClient' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$conversationId', '$$convId'] },
                    { $eq: ['$senderRole', 'admin'] },
                    {
                      $gt: [
                        '$createdAt',
                        { $ifNull: ['$$lastReadAt', new Date(0)] },
                      ],
                    },
                  ],
                },
              },
            },
            { $count: 'count' },
          ],
          as: 'unread',
        },
      },
      {
        $addFields: {
          unreadCount: { $ifNull: [{ $arrayElemAt: ['$unread.count', 0] }, 0] },
        },
      },
      { $project: { unread: 0 } },
    ]);

    res.json({
      conversations: conversations.map((conv) => ({
        id: conv._id.toString(),
        clientId: conv.clientId.toString(),
        recipientEmail: conv.recipientEmail,
        status: conv.status,
        lastMessageAt: conv.lastMessageAt ? new Date(conv.lastMessageAt).toISOString() : null,
        lastMessagePreview: conv.lastMessagePreview || '',
        lastMessageSenderRole: conv.lastMessageSenderRole ?? null,
        lastReadAtClient: conv.lastReadAtClient ? new Date(conv.lastReadAtClient).toISOString() : null,
        lastReadAtAdmin: conv.lastReadAtAdmin ? new Date(conv.lastReadAtAdmin).toISOString() : null,
        unreadCount: conv.unreadCount || 0,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const createConversation = async (req, res, next) => {
  try {
    const payload = validateCreateConversation(req.body || {});
    const recipientEmail = payload.recipientEmail.toLowerCase();
    const allowed = getAllowedRecipients();
    if (!allowed.includes(recipientEmail)) {
      throw badRequest('Invalid recipient selected.', [{ field: 'recipientEmail' }]);
    }

    const clientId = req.user._id;

    const conversation = await Conversation.findOneAndUpdate(
      { clientId, recipientEmail },
      {
        $setOnInsert: {
          clientId,
          recipientEmail,
          status: 'open',
        },
      },
      { new: true, upsert: true }
    );

    res.json({ conversation: conversation.toJSON() });
  } catch (error) {
    next(error);
  }
};

const listMessages = async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw badRequest('Invalid conversation id.');
    }

    const query = validateListQuery(req.query || {});
    const limit = query.limit;
    const cursor = query.cursor;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw notFound('Conversation not found.');
    }
    if (conversation.clientId.toString() !== req.user._id.toString()) {
      throw forbidden();
    }

    const cursorDate = cursor ? new Date(cursor) : null;
    const cursorFilter = cursorDate && !Number.isNaN(cursorDate.getTime()) ? { $lt: cursorDate } : undefined;

    const messages = await Message.find({
      conversationId: conversation._id,
      ...(cursorFilter ? { createdAt: cursorFilter } : {}),
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    const nextCursor = messages.length > 0 ? messages[messages.length - 1].createdAt.toISOString() : null;

    res.json({
      conversation: conversation.toJSON(),
      messages: messages.map((m) => m.toJSON()),
      nextCursor,
    });
  } catch (error) {
    next(error);
  }
};

const markConversationRead = async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw badRequest('Invalid conversation id.');
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw notFound('Conversation not found.');
    }
    if (conversation.clientId.toString() !== req.user._id.toString()) {
      throw forbidden();
    }

    conversation.lastReadAtClient = new Date();
    await conversation.save();

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw badRequest('Invalid conversation id.');
    }

    const payload = validateSendMessage(req.body || {});
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw notFound('Conversation not found.');
    }
    if (conversation.clientId.toString() !== req.user._id.toString()) {
      throw forbidden();
    }

    const now = new Date();
    const message = await Message.create({
      conversationId: conversation._id,
      senderRole: 'client',
      senderUserId: req.user._id,
      body: payload.body,
    });

    conversation.status = 'open';
    conversation.lastMessageAt = now;
    conversation.lastMessagePreview = payload.body.slice(0, 160);
    conversation.lastMessageSenderRole = 'client';
    conversation.lastReadAtClient = now;
    await conversation.save();

    try {
      await sendSupportClientMessageEmailToAdmin({
        to: conversation.recipientEmail,
        clientName: req.user.name,
        clientEmail: req.user.email,
        clientType: req.user.clientType,
        message: payload.body,
      });
    } catch (emailError) {
      console.error('Failed to send admin message notification email', emailError);
    }

    res.json({
      conversation: conversation.toJSON(),
      message: message.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listConversations,
  createConversation,
  listMessages,
  sendMessage,
  markConversationRead,
  pingPresence: async (req, res, next) => {
    try {
      const conversationId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        throw badRequest('Invalid conversation id.');
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw notFound('Conversation not found.');
      }
      if (conversation.clientId.toString() !== req.user._id.toString()) {
        throw forbidden();
      }

      conversation.clientOnlineAt = new Date();
      await conversation.save();

      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },
};
