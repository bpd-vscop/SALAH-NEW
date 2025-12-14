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
    homepageManufacturers: z.array(objectId).max(18).default([]),
    allManufacturersHeroImage: uploadsPathSchema.optional().nullable(),
  })
  .strict();

module.exports = {
  validateUpdateManufacturerDisplay: (payload) => parseWithSchema(updateSchema, payload),
};
