const { z } = require('zod');
const { parseWithSchema } = require('./index');

const optionalTrimmed = (schema) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }, schema.optional());

const nullableTrimmed = (schema) =>
  z.preprocess((value) => {
    if (value === null) {
      return null;
    }
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }, z.union([schema, z.null()]).optional());

const createTaxRateSchema = z
  .object({
    country: optionalTrimmed(z.string().max(120)),
    state: optionalTrimmed(z.string().max(120)),
    rate: z.number().min(0).max(100),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.country && !data.state) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Country or state is required',
        path: ['country'],
      });
    }
  });

const updateTaxRateSchema = z
  .object({
    country: nullableTrimmed(z.string().max(120)),
    state: nullableTrimmed(z.string().max(120)),
    rate: z.number().min(0).max(100).optional(),
  })
  .strict();

module.exports = {
  validateCreateTaxRate: (payload) => parseWithSchema(createTaxRateSchema, payload),
  validateUpdateTaxRate: (payload) => parseWithSchema(updateTaxRateSchema, payload),
};
