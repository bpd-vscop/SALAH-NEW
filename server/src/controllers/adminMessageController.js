const mongoose = require('mongoose');

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { badRequest, notFound } = require('../utils/appError');
const { validateSendMessage, validateListQuery, validateAdminCompose, validateClientSearchQuery } = require('../validators/messages');
const { sendSupportAdminReplyEmailToClient } = require('../services/emailService');

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

const buildEmailAttachments = (files) => {
  if (!Array.isArray(files) || files.length === 0) return [];
  return files
    .filter((file) => file && file.buffer)
    .map((file) => ({
      filename: file.originalname || 'attachment',
      content: file.buffer,
      contentType: file.mimetype || 'application/octet-stream',
    }));
};

const parseClientIds = (value) => {
  if (Array.isArray(value)) {
    return value.map((v) => String(v));
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v));
      }
    } catch (_e) {
      // ignore
    }
    return trimmed.split(',').map((v) => v.trim()).filter(Boolean);
  }
  return [];
};

const listConversations = async (req, res, next) => {
  try {
    const limit = 80;

    const conversations = await Conversation.aggregate([
      { $sort: { lastMessageAt: -1, updatedAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'clientId',
          foreignField: '_id',
          as: 'client',
        },
      },
      { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'messages',
          let: { convId: '$_id', lastReadAt: '$lastReadAtAdmin' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$conversationId', '$$convId'] },
                    { $eq: ['$senderRole', 'client'] },
                    { $gt: ['$createdAt', { $ifNull: ['$$lastReadAt', new Date(0)] }] },
                  ],
                },
              },
            },
            { $count: 'count' },
          ],
          as: 'unread',
        },
      },
      { $addFields: { unreadCount: { $ifNull: [{ $arrayElemAt: ['$unread.count', 0] }, 0] } } },
      { $project: { unread: 0 } },
    ]);

    res.json({
      conversations: conversations.map((conv) => ({
        id: conv._id.toString(),
        recipientEmail: conv.recipientEmail,
        status: conv.status,
        lastMessageAt: conv.lastMessageAt ? new Date(conv.lastMessageAt).toISOString() : null,
        lastMessagePreview: conv.lastMessagePreview || '',
        lastMessageSenderRole: conv.lastMessageSenderRole ?? null,
        lastReadAtAdmin: conv.lastReadAtAdmin ? new Date(conv.lastReadAtAdmin).toISOString() : null,
        clientOnlineAt: conv.clientOnlineAt ? new Date(conv.clientOnlineAt).toISOString() : null,
        unreadCount: conv.unreadCount || 0,
        client: conv.client
          ? {
              id: conv.client._id?.toString?.() ?? null,
              name: conv.client.name ?? '',
              email: conv.client.email ?? null,
              clientType: conv.client.clientType ?? null,
              lastActiveAt: conv.client.lastActiveAt ? new Date(conv.client.lastActiveAt).toISOString() : null,
            }
          : null,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const listClients = async (req, res, next) => {
  try {
    const query = validateClientSearchQuery(req.query || {});
    const q = query.q.trim();
    const limit = query.limit;

    const filter = { role: 'client' };
    const searchFilter = q
      ? {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
          ],
        }
      : {};

    const clients = await User.find({ ...filter, ...searchFilter })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select({ name: 1, email: 1, clientType: 1, lastActiveAt: 1 });

    res.json({
      clients: clients.map((client) => ({
        id: client._id.toString(),
        name: client.name ?? '',
        email: client.email ?? null,
        clientType: client.clientType ?? null,
        lastActiveAt: client.lastActiveAt ? new Date(client.lastActiveAt).toISOString() : null,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const composeConversations = async (req, res, next) => {
  try {
    const payload = validateAdminCompose(req.body || {});
    const recipientEmail = payload.recipientEmail.toLowerCase();
    const allowed = getAllowedRecipients();
    if (!allowed.includes(recipientEmail)) {
      throw badRequest('Invalid recipient selected.', [{ field: 'recipientEmail' }]);
    }

    const clientIds = Array.from(new Set(payload.clientIds));
    const invalid = clientIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalid.length > 0) {
      throw badRequest('Invalid client selection.');
    }

    const clients = await User.find({ _id: { $in: clientIds }, role: 'client' }).select({ name: 1, email: 1, clientType: 1 });
    const clientById = new Map(clients.map((c) => [c._id.toString(), c]));
    const missing = clientIds.filter((id) => !clientById.has(id));
    if (missing.length > 0) {
      throw badRequest('Some clients were not found.');
    }

    const now = new Date();
    const results = [];

    for (const clientId of clientIds) {
      const client = clientById.get(clientId);
      const conversation = await Conversation.findOneAndUpdate(
        { clientId: client._id, recipientEmail },
        {
          $setOnInsert: { clientId: client._id, recipientEmail, status: 'open' },
        },
        { new: true, upsert: true }
      );

      const message = await Message.create({
        conversationId: conversation._id,
        senderRole: 'admin',
        senderUserId: req.user._id,
        body: payload.body,
      });

      conversation.status = 'open';
      conversation.lastMessageAt = now;
      conversation.lastMessagePreview = payload.body.slice(0, 160);
      conversation.lastMessageSenderRole = 'admin';
      conversation.lastReadAtAdmin = now;
      await conversation.save();

      if (client?.email) {
        try {
          await sendSupportAdminReplyEmailToClient({
            to: client.email,
            clientName: client.name,
            recipientEmail: conversation.recipientEmail,
            message: payload.body,
          });
        } catch (emailError) {
          console.error('Failed to send compose email', emailError);
        }
      }

      results.push({ conversation: conversation.toJSON(), message: message.toJSON() });
    }

    res.json({ results });
  } catch (error) {
    next(error);
  }
};

const composeConversationsWithAttachments = async (req, res, next) => {
  try {
    const payload = validateAdminCompose({
      clientIds: parseClientIds(req.body?.clientIds),
      recipientEmail: req.body?.recipientEmail,
      body: req.body?.body,
    });

    const attachments = buildEmailAttachments(req.files);

    const recipientEmail = payload.recipientEmail.toLowerCase();
    const allowed = getAllowedRecipients();
    if (!allowed.includes(recipientEmail)) {
      throw badRequest('Invalid recipient selected.', [{ field: 'recipientEmail' }]);
    }

    const clientIds = Array.from(new Set(payload.clientIds));
    const invalid = clientIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalid.length > 0) {
      throw badRequest('Invalid client selection.');
    }

    const clients = await User.find({ _id: { $in: clientIds }, role: 'client' }).select({ name: 1, email: 1, clientType: 1 });
    const clientById = new Map(clients.map((c) => [c._id.toString(), c]));
    const missing = clientIds.filter((id) => !clientById.has(id));
    if (missing.length > 0) {
      throw badRequest('Some clients were not found.');
    }

    const now = new Date();
    const results = [];

    for (const clientId of clientIds) {
      const client = clientById.get(clientId);
      const conversation = await Conversation.findOneAndUpdate(
        { clientId: client._id, recipientEmail },
        {
          $setOnInsert: { clientId: client._id, recipientEmail, status: 'open' },
        },
        { new: true, upsert: true }
      );

      const message = await Message.create({
        conversationId: conversation._id,
        senderRole: 'admin',
        senderUserId: req.user._id,
        body: payload.body,
      });

      conversation.status = 'open';
      conversation.lastMessageAt = now;
      conversation.lastMessagePreview = payload.body.slice(0, 160);
      conversation.lastMessageSenderRole = 'admin';
      conversation.lastReadAtAdmin = now;
      await conversation.save();

      if (client?.email) {
        try {
          await sendSupportAdminReplyEmailToClient({
            to: client.email,
            clientName: client.name,
            recipientEmail: conversation.recipientEmail,
            message: payload.body,
            attachments,
          });
        } catch (emailError) {
          console.error('Failed to send compose email', emailError);
        }
      }

      results.push({ conversation: conversation.toJSON(), message: message.toJSON() });
    }

    res.json({ results });
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

    conversation.lastReadAtAdmin = new Date();
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

    const now = new Date();
    const message = await Message.create({
      conversationId: conversation._id,
      senderRole: 'admin',
      senderUserId: req.user._id,
      body: payload.body,
    });

    conversation.status = 'open';
    conversation.lastMessageAt = now;
    conversation.lastMessagePreview = payload.body.slice(0, 160);
    conversation.lastMessageSenderRole = 'admin';
    conversation.lastReadAtAdmin = now;
    await conversation.save();

    const client = await User.findById(conversation.clientId);
    if (client?.email) {
      try {
        await sendSupportAdminReplyEmailToClient({
          to: client.email,
          clientName: client.name,
          recipientEmail: conversation.recipientEmail,
          message: payload.body,
        });
      } catch (emailError) {
        console.error('Failed to send client reply email', emailError);
      }
    }

    res.json({
      conversation: conversation.toJSON(),
      message: message.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

const sendMessageWithAttachments = async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw badRequest('Invalid conversation id.');
    }

    const payload = validateSendMessage({ body: req.body?.body });
    const attachments = buildEmailAttachments(req.files);

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw notFound('Conversation not found.');
    }

    const now = new Date();
    const message = await Message.create({
      conversationId: conversation._id,
      senderRole: 'admin',
      senderUserId: req.user._id,
      body: payload.body,
    });

    conversation.status = 'open';
    conversation.lastMessageAt = now;
    conversation.lastMessagePreview = payload.body.slice(0, 160);
    conversation.lastMessageSenderRole = 'admin';
    conversation.lastReadAtAdmin = now;
    await conversation.save();

    const client = await User.findById(conversation.clientId);
    if (client?.email) {
      try {
        await sendSupportAdminReplyEmailToClient({
          to: client.email,
          clientName: client.name,
          recipientEmail: conversation.recipientEmail,
          message: payload.body,
          attachments,
        });
      } catch (emailError) {
        console.error('Failed to send client reply email', emailError);
      }
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
  listClients,
  composeConversations,
  composeConversationsWithAttachments,
  listMessages,
  sendMessage,
  sendMessageWithAttachments,
  markConversationRead,
};
