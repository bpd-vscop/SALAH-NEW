const { z } = require('zod');
const { parseWithSchema } = require('./index');

const usernameRegex = /^[a-z0-9._%+-@]{3,120}$/;

const clientRegisterSchema = z
  .object({
    clientType: z.enum(['B2B', 'C2B']),
    basicInfo: z
      .object({
        fullName: z.string().min(2).max(120),
        email: z.string().email(),
        password: z.string().min(8).max(128),
      })
      .strict(),
    companyInfo: z
      .object({
        companyName: z.string().min(1, 'Company name is required'),
        companyAddress: z.string().min(1, 'Company address is required'),
        companyPhone: z.string().min(1).optional(),
      })
      .partial()
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.clientType === 'B2B') {
      if (!data.companyInfo?.companyName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Company name is required for B2B accounts',
          path: ['companyInfo', 'companyName'],
        });
      }
      if (!data.companyInfo?.companyAddress) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Company address is required for B2B accounts',
          path: ['companyInfo', 'companyAddress'],
        });
      }
    }
  });

const loginSchema = z
  .object({
    identifier: z.string().min(1, 'Email or username is required'),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
  })
  .strict();

const verifyEmailSchema = z
  .object({
    email: z.string().email(),
    code: z
      .string()
      .regex(/^[0-9]{6}$/, 'Verification code must be a 6-digit string'),
  })
  .strict();

const resendVerificationSchema = verifyEmailSchema.pick({ email: true });

module.exports = {
  validateClientRegister: (payload) => parseWithSchema(clientRegisterSchema, payload),
  validateLogin: (payload) => parseWithSchema(loginSchema, payload),
  validateChangePassword: (payload) => parseWithSchema(changePasswordSchema, payload),
  validateVerifyEmail: (payload) => parseWithSchema(verifyEmailSchema, payload),
  validateResendVerification: (payload) => parseWithSchema(resendVerificationSchema, payload),
  usernameRegex,
};
