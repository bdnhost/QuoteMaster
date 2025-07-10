const Joi = require('joi');

// Validation schemas
const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    businessName: Joi.string().min(2).max(255).required(),
    businessPhone: Joi.string().min(10).max(20).required(),
    businessAddress: Joi.string().min(5).max(500).required()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  quote: Joi.object({
    customer: Joi.object({
      name: Joi.string().min(2).max(255).required(),
      email: Joi.string().email().allow(''),
      phone: Joi.string().min(10).max(20).allow(''),
      address: Joi.string().max(500).allow('')
    }).required(),
    items: Joi.array().items(
      Joi.object({
        description: Joi.string().min(1).max(500).required(),
        quantity: Joi.number().positive().required(),
        unitPrice: Joi.number().min(0).required()
      })
    ).min(1).required(),
    validUntil: Joi.string().isoDate().required(),
    taxRate: Joi.number().min(0).max(100).required(),
    notes: Joi.string().max(1000).allow('')
  }),

  invoice: Joi.object({
    quoteId: Joi.string().required(),
    dueDate: Joi.string().isoDate().required(),
    notes: Joi.string().max(1000).allow('')
  }),

  userRole: Joi.object({
    role: Joi.string().valid('admin', 'user').required()
  }),

  systemSettings: Joi.object({
    settings: Joi.object().pattern(
      Joi.string(),
      Joi.object({
        value: Joi.alternatives().try(
          Joi.string(),
          Joi.number(),
          Joi.boolean(),
          Joi.object()
        ).required(),
        type: Joi.string().valid('string', 'number', 'boolean', 'json'),
        description: Joi.string()
      })
    ).required()
  }),

  paymentMethod: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    type: Joi.string().valid('bank_transfer', 'credit_card', 'cash', 'check', 'paypal', 'other').required(),
    description: Joi.string().max(500).allow('')
  })
};

// Validation middleware factory
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return res.status(500).json({ error: 'Validation schema not found' });
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errorMessages
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Input sanitization
const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    // Remove potential XSS patterns
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  };

  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  next();
};

module.exports = {
  validate,
  sanitizeInput
};
