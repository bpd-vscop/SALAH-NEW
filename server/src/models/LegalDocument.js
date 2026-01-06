const mongoose = require('mongoose');

const legalDocumentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['privacy-policy', 'terms-of-service', 'return-policy', 'shipping-policy'],
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const LegalDocument = mongoose.model('LegalDocument', legalDocumentSchema);

module.exports = LegalDocument;
