const express = require('express');
const { body } = require('express-validator');
const customerController = require('../controllers/customerController');
const auth = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Validation rules
const customerValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be less than 100 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('phone').optional().matches(/^[\d\s\-\+\(\)\.]*$/).withMessage('Please enter a valid phone number')
];

// Routes
router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomer);
router.post('/', customerValidation, customerController.createCustomer);
router.put('/:id', customerValidation, customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

module.exports = router;