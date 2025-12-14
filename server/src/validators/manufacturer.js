const { z } = require('zod');
const { parseWithSchema } = require('./index');

const uploadsPathSchema = z
  .string()
  .min(1)
  .refine((value) => value.startsWith('/uploads/'), {
    message: 'Image must be an uploaded file path',
  });

const optionalUploadsOrEmptySchema = z.union([uploadsPathSchema, z.literal('')]).optional();

const createSchema = z
  .object({
    name: z.string().min(2).max(120),
    logoImage: uploadsPathSchema,
    heroImage: optionalUploadsOrEmptySchema,
    order: z.number().int().min(0).optional().default(0),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

const updateSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    logoImage: uploadsPathSchema.optional(),
    heroImage: optionalUploadsOrEmptySchema,
    order: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

module.exports = {
  validateCreateManufacturer: (payload) => parseWithSchema(createSchema, payload),
  validateUpdateManufacturer: (payload) => parseWithSchema(updateSchema, payload),
};
