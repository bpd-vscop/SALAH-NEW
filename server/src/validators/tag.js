const { z } = require('zod');
const { parseWithSchema } = require('./index');

const createSchema = z
  .object({
    name: z.string().min(1).max(120),
    order: z.number().int().min(0).optional().default(0),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

const updateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    order: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

module.exports = {
  validateCreateTag: (payload) => parseWithSchema(createSchema, payload),
  validateUpdateTag: (payload) => parseWithSchema(updateSchema, payload),
};
