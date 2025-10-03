const { z } = require('zod');
const { parseWithSchema } = require('./index');
const { usernameRegex } = require('./auth');

const createUserSchema = z
  .object({
    name: z.string().min(2).max(120),
    username: z.string().regex(usernameRegex, 'Invalid username'),
    role: z.enum(['admin', 'manager', 'staff', 'client']),
    status: z.enum(['active', 'inactive']).default('active'),
    password: z.string().min(8).max(128),
  })
  .strict();

const updateUserSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    username: z.string().regex(usernameRegex, 'Invalid username').optional(),
    role: z.enum(['admin', 'manager', 'staff', 'client']).optional(),
    status: z.enum(['active', 'inactive']).optional(),
    password: z.string().min(8).max(128).optional(),
  })
  .strict();

module.exports = {
  validateCreateUser: (payload) => parseWithSchema(createUserSchema, payload),
  validateUpdateUser: (payload) => parseWithSchema(updateUserSchema, payload),
};
