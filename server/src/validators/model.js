const { z } = require('zod');
const mongoose = require('mongoose');
const { parseWithSchema } = require('./index');

const objectId = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), 'Invalid brand reference');

const createSchema = z
  .object({
    name: z.string().min(1).max(120),
    brandId: objectId,
    order: z.number().int().min(0).optional().default(0),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

const updateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    brandId: objectId.optional(),
    order: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

module.exports = {
  validateCreateModel: (payload) => parseWithSchema(createSchema, payload),
  validateUpdateModel: (payload) => parseWithSchema(updateSchema, payload),
};
