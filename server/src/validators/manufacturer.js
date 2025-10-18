const { z } = require('zod');
const { parseWithSchema } = require('./index');

const base64Regex = /^data:image\/(png|jpg|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const bytesFromDataUrl = (dataUrl) => {
  const [, base64] = dataUrl.split(',');
  if (!base64) return 0;
  const padding = (base64.match(/=/g) || []).length;
  return Math.floor((base64.length * 3) / 4) - padding;
};

const createSchema = z
  .object({
    name: z.string().min(2).max(120),
    logoImage: z.string().regex(base64Regex, 'logoImage must be a base64 data URL'),
    heroImage: z
      .string()
      .regex(base64Regex, 'heroImage must be a base64 data URL')
      .optional()
      .or(z.literal(''))
      .optional(),
    order: z.number().int().min(0).optional().default(0),
    isActive: z.boolean().optional().default(true),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (bytesFromDataUrl(data.logoImage) > MAX_IMAGE_BYTES) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Logo must be 5 MB or smaller', path: ['logoImage'] });
    }
    if (data.heroImage && bytesFromDataUrl(data.heroImage) > MAX_IMAGE_BYTES) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Hero image must be 5 MB or smaller', path: ['heroImage'] });
    }
  });

const updateSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    logoImage: z.string().regex(base64Regex, 'logoImage must be a base64 data URL').optional(),
    heroImage: z
      .string()
      .regex(base64Regex, 'heroImage must be a base64 data URL')
      .optional()
      .or(z.literal(''))
      .optional(),
    order: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.logoImage && bytesFromDataUrl(data.logoImage) > MAX_IMAGE_BYTES) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Logo must be 5 MB or smaller', path: ['logoImage'] });
    }
    if (data.heroImage && data.heroImage !== '' && bytesFromDataUrl(data.heroImage) > MAX_IMAGE_BYTES) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Hero image must be 5 MB or smaller', path: ['heroImage'] });
    }
  });

module.exports = {
  validateCreateManufacturer: (payload) => parseWithSchema(createSchema, payload),
  validateUpdateManufacturer: (payload) => parseWithSchema(updateSchema, payload),
};

