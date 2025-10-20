const { z } = require('zod');
const { parseWithSchema } = require('./index');

const usernameRegex = /^[a-z0-9._-]{3,30}$/;

const registerSchema = z
  .object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    username: z.string().regex(usernameRegex).optional(),
    password: z.string().min(8).max(128),
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
    newPassword: z.string().min(8).max(128),
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
};
