const { z } = require('zod');
const { parseWithSchema } = require('./index');

const uploadsPathSchema = z
  .string()
  .min(1)
  .refine((value) => value.startsWith('/uploads/'), {
    message: 'image must be an uploaded image path',
  });

const downloadLinkSchema = z
  .object({
    label: z.string().max(120).optional().nullable(),
    url: z.string().min(1).max(500),
  })
  .strict();

const createSchema = z
  .object({
    name: z.string().min(1).max(140),
    description: z.string().max(4000).optional().nullable(),
    image: uploadsPathSchema.optional().nullable(),
    links: z.array(downloadLinkSchema).min(1).max(20),
  })
  .strict();

const updateSchema = z
  .object({
    name: z.string().min(1).max(140).optional(),
    description: z.string().max(4000).optional().nullable(),
    image: uploadsPathSchema.optional().nullable(),
    links: z.array(downloadLinkSchema).min(1).max(20).optional(),
  })
  .strict();

module.exports = {
  validateCreateDownload: (payload) => parseWithSchema(createSchema, payload),
  validateUpdateDownload: (payload) => parseWithSchema(updateSchema, payload),
};
