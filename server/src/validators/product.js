const { z } = require('zod');
const mongoose = require('mongoose');
const { parseWithSchema } = require('./index');
const Product = require('../models/Product');

const tagsEnum = z.enum(Product.allowedTags);
const objectId = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), 'Invalid identifier');

const productSchema = z
  .object({
    name: z.string().min(2).max(200),
    categoryId: objectId,
    tags: z.array(tagsEnum).optional(),
    description: z.string().max(5000).optional(),
    images: z.array(z.string().url()).max(10).optional(),
    price: z.number().min(0).optional(),
    attributes: z.record(z.string()).optional(),
  })
  .strict();

module.exports = {
  validateProduct: (payload) => parseWithSchema(productSchema, payload),
};
