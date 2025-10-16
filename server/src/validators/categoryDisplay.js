const { z } = require('zod');
const mongoose = require('mongoose');
const { parseWithSchema } = require('./index');

const base64Regex = /^data:image\/(png|jpg|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const urlRegex = /^https?:\/\//i;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const bytesFromDataUrl = (dataUrl) => {
  const [, base64] = dataUrl.split(',');
  if (!base64) {
    return 0;
  }
  const padding = (base64.match(/=/g) || []).length;
  return Math.floor((base64.length * 3) / 4) - padding;
};

const imageSchema = z
  .string()
  .max(MAX_IMAGE_BYTES * 2)
  .superRefine((value, ctx) => {
    if (base64Regex.test(value)) {
      if (bytesFromDataUrl(value) > MAX_IMAGE_BYTES) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Image must be 5 MB or smaller',
        });
      }
      return;
    }

    if (!urlRegex.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Image must be an http(s) URL or base64 data URL',
      });
    }
  });

const objectId = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), 'Invalid identifier');

const updateSchema = z
  .object({
    homepageCategories: z.array(objectId).max(12).default([]),
    allCategoriesHeroImage: imageSchema.optional().nullable(),
  })
  .strict();

module.exports = {
  validateUpdateCategoryDisplay: (payload) => parseWithSchema(updateSchema, payload),
};
