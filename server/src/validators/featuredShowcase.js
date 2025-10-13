const { z } = require('zod');
const { parseWithSchema } = require('./index');

const base64Regex = /^data:image\/(png|jpg|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const bytesFromDataUrl = (dataUrl) => {
  const [, base64] = dataUrl.split(',');
  if (!base64) {
    return 0;
  }
  const padding = (base64.match(/=/g) || []).length;
  return Math.floor((base64.length * 3) / 4) - padding;
};

const createSchema = z
  .object({
    variant: z.enum(['feature', 'tile']).default('tile'),
    title: z.string().min(2).max(160),
    subtitle: z.string().max(200).optional().default(''),
    category: z.string().max(120).optional().default(''),
    offer: z.string().max(120).optional().default(''),
    badgeText: z.string().max(60).optional().default(''),
    ctaText: z.string().min(2).max(60).optional().default('Shop Now'),
    linkUrl: z.string().min(1),
    price: z.string().max(60).optional().default(''),
    image: z.string().regex(base64Regex, 'image must be a base64 data URL'),
    order: z.number().int().min(0).optional().default(0),
    altText: z.string().max(160).optional().default(''),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (bytesFromDataUrl(data.image) > MAX_IMAGE_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Image must be 5 MB or smaller',
        path: ['image'],
      });
    }
  });

const updateSchema = z
  .object({
    variant: z.enum(['feature', 'tile']).optional(),
    title: z.string().min(2).max(160).optional(),
    subtitle: z.string().max(200).optional(),
    category: z.string().max(120).optional(),
    offer: z.string().max(120).optional(),
    badgeText: z.string().max(60).optional(),
    ctaText: z.string().min(2).max(60).optional(),
    linkUrl: z.string().min(1).optional(),
    price: z.string().max(60).optional(),
    image: z.string().regex(base64Regex, 'image must be a base64 data URL').optional(),
    order: z.number().int().min(0).optional(),
    altText: z.string().max(160).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.image && bytesFromDataUrl(data.image) > MAX_IMAGE_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Image must be 5 MB or smaller',
        path: ['image'],
      });
    }
  });

module.exports = {
  validateCreateFeatured: (payload) => parseWithSchema(createSchema, payload),
  validateUpdateFeatured: (payload) => parseWithSchema(updateSchema, payload),
};

