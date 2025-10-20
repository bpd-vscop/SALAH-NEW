const { z } = require('zod');
const { parseWithSchema } = require('./index');

const adminProfileSchema = z
  .object({
    fullName: z.string().min(2).max(120),
    email: z.string().email(),
    profileImage: z.union([z.string().min(1), z.null()]).optional(),
  })
  .strict();

module.exports = {
  validateAdminProfile: (payload) => parseWithSchema(adminProfileSchema, payload),
};
