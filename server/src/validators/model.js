const { z } = require('zod');
const { parseWithSchema } = require('./index');

const createSchema = z
  .object({
    name: z.string().min(2).max(120),
    brandId: z.string().optional().nullable(),
    order: z.number().int().min(0).optional().default(0),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

const updateSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    brandId: z.string().optional().nullable(),
    order: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

module.exports = {
  validateCreateModel: (payload) => parseWithSchema(createSchema, payload),
  validateUpdateModel: (payload) => parseWithSchema(updateSchema, payload),
};
