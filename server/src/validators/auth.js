const { z } = require('zod');
const { parseWithSchema } = require('./index');

const usernameRegex = /^[a-z0-9._@-]{3,120}$/;

const companyInfoSchema = z
  .object({
    companyName: z.string().min(2).max(160),
    companyAddress: z.string().min(5).max(240),
    companyPhone: z
      .string()
      .min(4)
      .max(40)
      .optional()
      .transform((value) => (value === undefined || value === null || value === '' ? undefined : value)),
  })
  .partial();

const clientRegistrationSchema = z
  .object({
    clientType: z.enum(['B2B', 'C2B']),
    basicInfo: z.object({
      fullName: z.string().min(2).max(120),
      email: z.string().email(),
      password: z.string().min(8).max(128),
    }),
    companyInfo: companyInfoSchema.optional(),
    guestCart: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z.number().int().positive().max(1000),
        })
      )
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.clientType === 'B2B') {
      if (!data.companyInfo?.companyName) {
        ctx.addIssue({
          path: ['companyInfo', 'companyName'],
          code: z.ZodIssueCode.custom,
          message: 'Company name is required for B2B accounts',
        });
      }
      if (!data.companyInfo?.companyAddress) {
        ctx.addIssue({
          path: ['companyInfo', 'companyAddress'],
          code: z.ZodIssueCode.custom,
          message: 'Company address is required for B2B accounts',
        });
      }
    }
  });

const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1, 'Password is required'),
    guestCart: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z.number().int().positive().max(1000),
        })
      )
      .optional(),
  })
  .strict();

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
  })
  .strict();

const verificationSchema = z
  .object({
    email: z.string().email(),
    code: z.string().regex(/^\d{6}$/, 'Verification code must be 6 digits'),
  })
  .strict();

module.exports = {
  validateClientRegistration: (payload) => parseWithSchema(clientRegistrationSchema, payload),
  validateLogin: (payload) => parseWithSchema(loginSchema, payload),
  validateChangePassword: (payload) => parseWithSchema(changePasswordSchema, payload),
  validateVerification: (payload) => parseWithSchema(verificationSchema, payload),
  usernameRegex,
};
