const { z } = require('zod');
const { parseWithSchema } = require('./index');

const emailSchema = z.string().trim().email();

const createConversationSchema = z.object({
  recipientEmail: emailSchema,
});

const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

const adminComposeSchema = z.object({
  clientIds: z.array(z.string().trim().min(1)).min(1).max(50),
  recipientEmail: emailSchema,
  body: z.string().trim().min(1).max(5000),
});

const clientSearchSchema = z.object({
  q: z.string().trim().optional().default(''),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 25))
    .refine((val) => Number.isFinite(val) && val > 0 && val <= 200, 'Invalid limit'),
});

const listSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 30))
    .refine((val) => Number.isFinite(val) && val > 0 && val <= 200, 'Invalid limit'),
  cursor: z.string().optional(),
});

module.exports = {
  validateCreateConversation: (payload) => parseWithSchema(createConversationSchema, payload),
  validateSendMessage: (payload) => parseWithSchema(sendMessageSchema, payload),
  validateAdminCompose: (payload) => parseWithSchema(adminComposeSchema, payload),
  validateClientSearchQuery: (payload) => parseWithSchema(clientSearchSchema, payload),
  validateListQuery: (payload) => parseWithSchema(listSchema, payload),
};
