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
    title: z.string().min(2).max(120),
    subtitle: z.string().max(160).optional().default(''),
    caption: z.string().max(240).optional().default(''),
    ctaText: z.string().min(2).max(60).optional().default('Shop Now'),
    linkUrl: z.string().min(1),
    desktopImage: z.string().regex(base64Regex, 'desktopImage must be a base64 data URL'),
    mobileImage: z.string().regex(base64Regex, 'mobileImage must be a base64 data URL'),
    order: z.number().int().min(0).optional().default(0),
    altText: z.string().max(160).optional().default(''),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (bytesFromDataUrl(data.desktopImage) > MAX_IMAGE_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Desktop image must be 5 MB or smaller',
        path: ['desktopImage'],
      });
    }
    if (bytesFromDataUrl(data.mobileImage) > MAX_IMAGE_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Mobile image must be 5 MB or smaller',
        path: ['mobileImage'],
      });
    }
  });

const updateSchema = z
  .object({
    title: z.string().min(2).max(120).optional(),
    subtitle: z.string().max(160).optional(),
    caption: z.string().max(240).optional(),
    ctaText: z.string().min(2).max(60).optional(),
    linkUrl: z.string().min(1).optional(),
    desktopImage: z.string().regex(base64Regex, 'desktopImage must be a base64 data URL').optional(),
    mobileImage: z.string().regex(base64Regex, 'mobileImage must be a base64 data URL').optional(),
    order: z.number().int().min(0).optional(),
    altText: z.string().max(160).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.desktopImage && bytesFromDataUrl(data.desktopImage) > MAX_IMAGE_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Desktop image must be 5 MB or smaller',
        path: ['desktopImage'],
      });
    }
    if (data.mobileImage && bytesFromDataUrl(data.mobileImage) > MAX_IMAGE_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Mobile image must be 5 MB or smaller',
        path: ['mobileImage'],
      });
    }
  });

module.exports = {
  validateCreateHeroSlide: (payload) => parseWithSchema(createSchema, payload),
  validateUpdateHeroSlide: (payload) => parseWithSchema(updateSchema, payload),
};

