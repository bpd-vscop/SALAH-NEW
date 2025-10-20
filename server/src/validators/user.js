const { z } = require('zod');
const { parseWithSchema } = require('./index');
const { usernameRegex } = require('./auth');

const createUserSchema = z
  .object({
    name: z.string().min(2).max(120),
    username: z.string().regex(usernameRegex, 'Invalid username'),
    email: z.string().email(),
    role: z.enum(['super_admin', 'admin', 'staff', 'client']),
    status: z.enum(['active', 'inactive']).default('active'),
    password: z.string().min(8).max(128),
    profileImageUrl: z.string().url().optional(),
  })
  .strict();

const updateUserSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    username: z.string().regex(usernameRegex, 'Invalid username').optional(),
    email: z.string().email().optional(),
    role: z.enum(['super_admin', 'admin', 'staff', 'client']).optional(),
    status: z.enum(['active', 'inactive']).optional(),
    password: z.string().min(8).max(128).optional(),
    profileImageUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  })
  .strict();

module.exports = {
  validateCreateUser: (payload) => parseWithSchema(createUserSchema, payload),
  validateUpdateUser: (payload) => parseWithSchema(updateUserSchema, payload),
};
