const { z } = require('zod');
const { parseWithSchema } = require('./index');
const { usernameRegex } = require('./auth');
const { meetsPasswordComplexity, PASSWORD_COMPLEXITY_MESSAGE } = require('../utils/password');

const createUserSchema = z
  .object({
    name: z.string().min(2).max(120),
    username: z.string().regex(usernameRegex, 'Invalid username').optional(),
    email: z.string().email().optional(),
    role: z.enum(['super_admin', 'admin', 'staff', 'client']),
    status: z.enum(['active', 'inactive']).default('active'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password must be at most 128 characters long')
      .refine((value) => meetsPasswordComplexity(value), {
        message: PASSWORD_COMPLEXITY_MESSAGE,
      }),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.role === 'client' && data.username) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Clients do not use usernames',
        path: ['username'],
      });
    }
    if (data.role !== 'client' && !data.username) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Username is required for this role',
        path: ['username'],
      });
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
    phoneCode: z.string().optional(),
    phoneNumber: z.string().optional(),
  })
  .strict();

module.exports = {
  validateCreateUser: (payload) => parseWithSchema(createUserSchema, payload),
  validateUpdateUser: (payload) => parseWithSchema(updateUserSchema, payload),
};
