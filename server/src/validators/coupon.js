const { z } = require('zod');
const mongoose = require('mongoose');
const { parseWithSchema } = require('./index');

const couponTypeEnum = z.enum(['percentage', 'fixed']);

const objectId = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), 'Invalid identifier');

const couponCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(40)
  .regex(/^[A-Za-z0-9-_]+$/, 'Coupon codes may only contain letters, numbers, hyphens, and underscores')
  .transform((value) => value.toUpperCase());

const createCouponSchema = z
  .object({
    code: couponCodeSchema,
    type: couponTypeEnum,
    amount: z.number().min(0),
    isActive: z.boolean().optional(),
    categoryIds: z.array(objectId).optional(),
    productIds: z.array(objectId).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.type === 'percentage' && data.amount > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amount'],
        message: 'Percentage discounts cannot exceed 100',
      });
    }
  });

const updateCouponSchema = z
  .object({
    code: couponCodeSchema.optional(),
    type: couponTypeEnum.optional(),
    amount: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
    categoryIds: z.array(objectId).optional(),
    productIds: z.array(objectId).optional(),
  })
  .strict();

const applyCouponSchema = z
  .object({
    code: couponCodeSchema,
    items: z
      .array(
        z.object({
          productId: objectId,
          quantity: z.number().int().min(1),
        })
      )
      .min(1),
  })
  .strict();

module.exports = {
  validateCreateCoupon: (payload) => parseWithSchema(createCouponSchema, payload),
  validateUpdateCoupon: (payload) => parseWithSchema(updateCouponSchema, payload),
  validateApplyCoupon: (payload) => parseWithSchema(applyCouponSchema, payload),
};
