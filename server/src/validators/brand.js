const { z } = require('zod');
const { parseWithSchema } = require('./index');

const uploadsPathSchema = z
  .string()
  .min(1)
  .refine((value) => value.startsWith('/uploads/'), {
    message: 'logoImage must be an uploaded image path',
  });

const createSchema = z
  .object({
    name: z.string().min(1).max(120),
    logoImage: uploadsPathSchema.optional().nullable(),
    order: z.number().int().min(0).optional().default(0),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

const updateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    logoImage: uploadsPathSchema.optional().nullable(),
    order: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

module.exports = {
  validateCreateBrand: (payload) => parseWithSchema(createSchema, payload),
  validateUpdateBrand: (payload) => parseWithSchema(updateSchema, payload),
};
