const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
      index: true,
    },
    lastMessageAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastMessagePreview: {
      type: String,
      default: '',
      trim: true,
    },
    lastMessageSenderRole: {
      type: String,
      enum: ['client', 'admin'],
      default: null,
      index: true,
    },
    lastReadAtClient: {
      type: Date,
      default: null,
    },
    lastReadAtAdmin: {
      type: Date,
      default: null,
    },
    clientOnlineAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.clientId = ret.clientId ? ret.clientId.toString() : null;
        ret.createdAt = ret.createdAt ? new Date(ret.createdAt).toISOString() : null;
        ret.updatedAt = ret.updatedAt ? new Date(ret.updatedAt).toISOString() : null;
        ret.lastMessageAt = ret.lastMessageAt ? new Date(ret.lastMessageAt).toISOString() : null;
        ret.lastReadAtClient = ret.lastReadAtClient ? new Date(ret.lastReadAtClient).toISOString() : null;
        ret.lastReadAtAdmin = ret.lastReadAtAdmin ? new Date(ret.lastReadAtAdmin).toISOString() : null;
        ret.clientOnlineAt = ret.clientOnlineAt ? new Date(ret.clientOnlineAt).toISOString() : null;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

conversationSchema.index({ clientId: 1, recipientEmail: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);
