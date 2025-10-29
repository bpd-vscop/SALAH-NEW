const { z } = require('zod');
const { parseWithSchema } = require('./index');
const { meetsPasswordComplexity, PASSWORD_COMPLEXITY_MESSAGE } = require('../utils/password');

const trimmedString = z.string().trim();
const optionalTrimmedString = z.string().trim().optional();

const clientRegistrationSchema = z
  .object({
    clientType: z.enum(['B2B', 'C2B']),
    basicInfo: z
      .object({
        fullName: trimmedString.min(1, 'Full name is required').max(120),
        email: z.string().trim().email('A valid email address is required'),
        password: z
          .string()
          .min(8, 'Password must be at least 8 characters')
          .max(128, 'Password must be at most 128 characters')
          .refine((value) => meetsPasswordComplexity(value), {
            message: PASSWORD_COMPLEXITY_MESSAGE,
          }),
        phoneCode: trimmedString.min(1, 'Phone code is required'),
        phoneNumber: trimmedString.min(1, 'Phone number is required'),
      })
      .strict(),
    companyInfo: z
      .object({
        companyName: trimmedString.optional(),
        businessType: optionalTrimmedString,
        taxId: optionalTrimmedString,
        companyWebsite: optionalTrimmedString,
        companyPhone: optionalTrimmedString,
        companyAddress: optionalTrimmedString,
      })
      .partial()
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.clientType === 'B2B') {
      if (!value.companyInfo?.companyName) {
        ctx.addIssue({
          path: ['companyInfo', 'companyName'],
          code: z.ZodIssueCode.custom,
          message: 'Company name is required for B2B registration',
        });
      }
    }
  });

module.exports = {
  validateClientRegistration: (payload) => parseWithSchema(clientRegistrationSchema, payload),
};
