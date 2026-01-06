const mongoose = require('mongoose');

const downloadLinkSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    url: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const downloadEntrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '', trim: true },
    image: { type: String, default: '' },
    links: { type: [downloadLinkSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.createdAt = ret.createdAt ? new Date(ret.createdAt).toISOString() : null;
        ret.updatedAt = ret.updatedAt ? new Date(ret.updatedAt).toISOString() : null;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('DownloadEntry', downloadEntrySchema);
