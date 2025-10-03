const { z } = require('zod');
const { parseWithSchema } = require('./index');

const usernameRegex = /^[a-z0-9._-]{3,30}$/;

const registerSchema = z
  .object({
    name: z.string().min(2).max(120),
    username: z.string().regex(usernameRegex, 'Username can contain lowercase letters, numbers, dot, underscore, or dash'),
    password: z.string().min(8).max(128),
    role: z.enum(['admin', 'manager', 'staff', 'client']).optional(),
  })
  .strict();

const loginSchema = z
  .object({
    username: z.string().regex(usernameRegex, 'Invalid username'),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
  })
  .strict();

module.exports = {
  validateRegister: (payload) => parseWithSchema(registerSchema, payload),
  validateLogin: (payload) => parseWithSchema(loginSchema, payload),
  validateChangePassword: (payload) => parseWithSchema(changePasswordSchema, payload),
  usernameRegex,
};
