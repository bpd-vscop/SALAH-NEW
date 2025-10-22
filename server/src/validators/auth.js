const { z } = require('zod');
const { parseWithSchema } = require('./index');
const { meetsPasswordComplexity, PASSWORD_COMPLEXITY_MESSAGE } = require('../utils/password');

const usernameRegex = /^[a-z0-9._-]{3,30}$/;

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be at most 128 characters long')
  .refine((value) => meetsPasswordComplexity(value), {
    message: PASSWORD_COMPLEXITY_MESSAGE,
  });

const registerSchema = z
  .object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    username: z.string().regex(usernameRegex).optional(),
    password: passwordSchema,
    role: z.enum(['super_admin', 'admin', 'staff', 'client']).optional(),
  })
  .strict();

const loginSchema = z
  .object({
    username: z.string().min(1, 'Username or email is required').max(320),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
  })
  .strict();

const verificationCodeSchema = z
  .object({
    email: z.string().email(),
    code: z.string().regex(/^[0-9]{6}$/, 'Verification code must be 6 digits'),
  })
  .strict();

module.exports = {
  validateRegister: (payload) => parseWithSchema(registerSchema, payload),
  validateLogin: (payload) => parseWithSchema(loginSchema, payload),
  validateChangePassword: (payload) => parseWithSchema(changePasswordSchema, payload),
  validateVerificationCode: (payload) => parseWithSchema(verificationCodeSchema, payload),
  usernameRegex,
  passwordSchema,
};
