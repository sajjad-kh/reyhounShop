const Joi = require('joi');

/**
 * User registration validation schema
 */
const userRegistrationSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
    'any.required': 'Password is required'
  }),
  name: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 50 characters',
    'any.required': 'Name is required'
  }),
  phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).optional().messages({
    'string.pattern.base': 'Please provide a valid phone number'
  }),
  birthDate: Joi.date().max('now').optional().messages({
    'date.max': 'Birth date cannot be in the future'
  })
});

/**
 * User login validation schema
 */
const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

/**
 * Product creation validation schema
 */
const productSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(1000).optional(),
  price: Joi.number().integer().min(0).required(),
  discountPrice: Joi.number().integer().min(0).optional(),
  stock: Joi.number().integer().min(0).required(),
  categoryId: Joi.number().integer().required(),
  lowStockAlert: Joi.number().integer().min(0).default(5)
});

/**
 * Order creation validation schema
 */
const orderSchema = Joi.object({
  addressId: Joi.number().integer().required(),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.number().integer().required(),
      quantity: Joi.number().integer().min(1).required()
    })
  ).min(1).required()
});

/**
 * Generic validation middleware
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Request property to validate (body, query, params)
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors
        }
      });
    }

    req[property] = value;
    next();
  };
};

module.exports = {
  userRegistrationSchema,
  userLoginSchema,
  productSchema,
  orderSchema,
  validate
};