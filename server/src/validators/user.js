const { z } = require('zod');
const { parseWithSchema } = require('./index');
const { usernameRegex } = require('./auth');
const { meetsPasswordComplexity, PASSWORD_COMPLEXITY_MESSAGE } = require('../utils/password');

const optionalTrimmed = (schema) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }, schema.optional());

const createUserSchema = z
  .object({
    name: optionalTrimmed(z.string().min(2, 'Name must be at least 2 characters').max(120)),
    username: optionalTrimmed(z.string().regex(usernameRegex, 'Invalid username')),
    email: optionalTrimmed(z.string().email('Invalid email address')),
    role: z.enum(['super_admin', 'admin', 'staff', 'client']),
    status: z.enum(['active', 'inactive']).default('active'),
    password: optionalTrimmed(
      z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .max(128, 'Password must be at most 128 characters long')
        .refine((value) => meetsPasswordComplexity(value), {
          message: PASSWORD_COMPLEXITY_MESSAGE,
        })
    ),
    clientType: z.enum(['B2B', 'C2B']).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.role === 'client') {
      if (data.username) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Clients do not use usernames',
          path: ['username'],
        });
      }
    } else {
      if (!data.username) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Username is required for this role',
          path: ['username'],
        });
      }
      if (!data.password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Password is required for this role',
          path: ['password'],
        });
      }
      if (!data.name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Name is required for this role',
          path: ['name'],
        });
      }
    }
  });

const updateUserSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    fullName: z.string().min(2).max(120).optional(),
    username: z.union([z.string().regex(usernameRegex, 'Invalid username'), z.null()]).optional(),
    email: z.string().email().optional(),
    role: z.enum(['super_admin', 'admin', 'staff', 'client']).optional(),
    status: z.enum(['active', 'inactive']).optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password must be at most 128 characters long')
      .refine((value) => meetsPasswordComplexity(value), {
        message: PASSWORD_COMPLEXITY_MESSAGE,
      })
      .optional(),
    profileImage: z.union([z.string().min(1), z.null()]).optional(),
    removeProfileImage: z
      .preprocess((val) => {
        if (typeof val === 'string') {
          return val === 'true';
        }
        return val;
      }, z.boolean())
      .optional(),
    verificationFileUrl: z.union([z.string().min(1), z.null()]).optional(),
    phoneCode: z.string().optional(),
    phoneNumber: z.string().optional(),
    companyTaxId: optionalTrimmed(z.string().max(80)),
    companyWebsite: optionalTrimmed(
      z
        .string()
        .max(200)
        .regex(/^[^\s]+\.[^\s]+$/, 'Website must be a valid domain or URL')
    ),
    clientType: z.enum(['B2B', 'C2B']).optional(),
    companyName: optionalTrimmed(z.string().max(120)),
    companyPhone: optionalTrimmed(z.string().max(40)),
    companyAddress: optionalTrimmed(z.string().max(200)),
    companyBusinessType: optionalTrimmed(z.string().max(120)),
  })
  .strict();

const convertToB2BSchema = z
  .object({
    companyName: z.string().trim().min(2, 'Company name is required').max(120),
    businessType: z.string().trim().min(2, 'Business type is required').max(120),
    taxId: optionalTrimmed(z.string().max(80)),
    website: optionalTrimmed(
      z
        .string()
        .max(200)
        .regex(/^[^\s]+\.[^\s]+$/, 'Website must be a valid domain or URL')
    ),
  })
  .strict();

module.exports = {
  validateCreateUser: (payload) => parseWithSchema(createUserSchema, payload),
  validateUpdateUser: (payload) => parseWithSchema(updateUserSchema, payload),
  validateConvertToB2B: (payload) => parseWithSchema(convertToB2BSchema, payload),
};
