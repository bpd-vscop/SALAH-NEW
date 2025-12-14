const { z } = require('zod');
const mongoose = require('mongoose');
const { parseWithSchema } = require('./index');

const objectId = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), 'Invalid identifier');

const uploadsPathSchema = z
  .string()
  .min(1)
  .refine((value) => value.startsWith('/uploads/'), {
    message: 'Image must be an uploaded image path',
  });

const createCategorySchema = z
  .object({
    name: z.string().min(2).max(80),
    parentId: objectId.optional().nullable(),
    imageUrl: uploadsPathSchema.optional().nullable(),
    heroImageUrl: uploadsPathSchema.optional().nullable(),
  })
  .strict();

const updateCategorySchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    parentId: objectId.optional().nullable(),
    imageUrl: uploadsPathSchema.optional().nullable(),
    heroImageUrl: uploadsPathSchema.optional().nullable(),
  })
  .strict();

module.exports = {
  validateCreateCategory: (payload) => parseWithSchema(createCategorySchema, payload),
  validateUpdateCategory: (payload) => parseWithSchema(updateCategorySchema, payload),
};
