const { z } = require('zod');
const mongoose = require('mongoose');
const { parseWithSchema } = require('./index');

const objectId = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), 'Invalid identifier');

const categorySchema = z
  .object({
    name: z.string().min(2).max(80),
    parentId: objectId.optional().nullable(),
  })
  .strict();

module.exports = {
  validateCategory: (payload) => parseWithSchema(categorySchema, payload),
};
