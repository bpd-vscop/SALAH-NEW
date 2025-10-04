const { z } = require('zod');
const mongoose = require('mongoose');
const { parseWithSchema } = require('./index');
const Product = require('../models/Product');

const tagsEnum = z.enum(Product.allowedTags);
const objectId = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), 'Invalid identifier');

const baseFields = {
  name: z.string().min(2).max(200),
  categoryId: objectId,
  tags: z.array(tagsEnum).optional(),
  description: z.string().max(5000).optional(),
  images: z.array(z.string().url()).max(10).optional(),
  price: z.number().min(0).optional(),
  attributes: z.record(z.string()).optional(),
};

const createProductSchema = z
  .object({
    name: baseFields.name,
    categoryId: baseFields.categoryId,
    tags: baseFields.tags,
    description: baseFields.description,
    images: baseFields.images,
    price: baseFields.price,
    attributes: baseFields.attributes,
  })
  .strict();

const updateProductSchema = z
  .object({
    name: baseFields.name.optional(),
    categoryId: baseFields.categoryId.optional(),
    tags: baseFields.tags,
    description: baseFields.description,
    images: baseFields.images,
    price: baseFields.price,
    attributes: baseFields.attributes,
  })
  .strict();

module.exports = {
  validateCreateProduct: (payload) => parseWithSchema(createProductSchema, payload),
  validateUpdateProduct: (payload) => parseWithSchema(updateProductSchema, payload),
};
