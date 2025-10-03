﻿const { ZodError } = require('zod');
const { badRequest } = require('../utils/appError');

const parseWithSchema = (schema, payload) => {
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      throw badRequest('Validation failed', details);
    }
    throw error;
  }
};

module.exports = {
  parseWithSchema,
};
