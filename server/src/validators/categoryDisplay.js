const { z } = require('zod');
const mongoose = require('mongoose');
const { parseWithSchema } = require('./index');

const uploadsPathSchema = z
  .string()
  .min(1)
  .refine((value) => value.startsWith('/uploads/'), {
    message: 'Image must be an uploaded image path',
  });

const objectId = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), 'Invalid identifier');

const updateSchema = z
  .object({
    homepageCategories: z.array(objectId).max(12).default([]),
    allCategoriesHeroImage: uploadsPathSchema.optional().nullable(),
  })
  .strict();

module.exports = {
  validateUpdateCategoryDisplay: (payload) => parseWithSchema(updateSchema, payload),
};
