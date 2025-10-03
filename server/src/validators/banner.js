const { z } = require('zod');
const { parseWithSchema } = require('./index');

const bannerSchema = z
  .object({
    type: z.enum(['slide', 'row', 'advertising']),
    imageUrl: z.string().url(),
    linkUrl: z.string().url().optional().nullable(),
    text: z.string().max(200).optional().nullable(),
    order: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

module.exports = {
  validateBanner: (payload) => parseWithSchema(bannerSchema, payload),
};
