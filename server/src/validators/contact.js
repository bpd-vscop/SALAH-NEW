const { z } = require('zod');
const { parseWithSchema } = require('./index');

const emailSchema = z.string().trim().email();

const sendContactEmailSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: emailSchema,
  phone: z.string().trim().max(50).optional().default(''),
  recipient: emailSchema,
  message: z.string().trim().min(1).max(5000),
});

module.exports = {
  validateSendContactEmail: (payload) => parseWithSchema(sendContactEmailSchema, payload),
};

