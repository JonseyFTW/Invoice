const { body, query, param } = require('express-validator');

// Auth validations
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Customer validations
const customerValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name is required and must be less than 100 characters'),

  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),

  body('phone')
    .optional()
    .matches(/^[\d\s\-\+\(\)\.]*$/)
    .withMessage('Please enter a valid phone number'),

  body('billingAddress')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters'),
];

// Invoice validations
const invoiceValidation = [
  body('customerId')
    .isUUID()
    .withMessage('Valid customer ID is required'),

  body('invoiceDate')
    .isISO8601()
    .toDate()
    .withMessage('Valid invoice date is required'),

  body('dueDate')
    .isISO8601()
    .toDate()
    .withMessage('Valid due date is required')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.invoiceDate)) {
        throw new Error('Due date must be after invoice date');
      }
      return true;
    }),

  body('taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate must be between 0 and 100'),

  body('lineItems')
    .isArray({ min: 1 })
    .withMessage('At least one line item is required'),

  body('lineItems.*.description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Line item description is required and must be less than 500 characters'),

  body('lineItems.*.quantity')
    .isFloat({ gt: 0 })
    .withMessage('Quantity must be greater than 0'),

  body('lineItems.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be 0 or greater'),

  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),
];

// Expense validations
const expenseValidation = [
  body('vendor')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Vendor name is required and must be less than 100 characters'),

  body('description')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Description is required and must be less than 1000 characters'),

  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be 0 or greater'),

  body('expenseDate')
    .isISO8601()
    .toDate()
    .withMessage('Valid expense date is required'),

  body('invoiceId')
    .optional()
    .isUUID()
    .withMessage('Valid invoice ID is required if provided'),
];

// Recurring template validations
const recurringValidation = [
  body('customerId')
    .isUUID()
    .withMessage('Valid customer ID is required'),

  body('templateName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Template name is required and must be less than 100 characters'),

  body('baseInvoiceData')
    .isObject()
    .withMessage('Invoice data is required'),

  body('frequency')
    .isIn(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'])
    .withMessage('Valid frequency is required'),

  body('startDate')
    .isISO8601()
    .toDate()
    .withMessage('Valid start date is required'),

  body('endDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Valid end date is required if provided')
    .custom((value, { req }) => {
      if (value && new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  body('occurrences')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Occurrences must be at least 1 if provided'),
];

// Query parameter validations
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

const searchValidation = [
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
];

// ID parameter validation
const idValidation = [
  param('id')
    .isUUID()
    .withMessage('Valid ID is required'),
];

// Date range validation
const dateRangeValidation = [
  query('from')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Valid from date is required'),

  query('to')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Valid to date is required')
    .custom((value, { req }) => {
      if (value && req.query.from && new Date(value) < new Date(req.query.from)) {
        throw new Error('To date must be after from date');
      }
      return true;
    }),
];

module.exports = {
  registerValidation,
  loginValidation,
  customerValidation,
  invoiceValidation,
  expenseValidation,
  recurringValidation,
  paginationValidation,
  searchValidation,
  idValidation,
  dateRangeValidation,
};
