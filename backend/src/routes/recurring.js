const express = require('express');
const { body } = require('express-validator');
const recurringController = require('../controllers/recurringController');
const auth = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Validation rules
const recurringValidation = [
  body('customerId').isUUID().withMessage('Valid customer ID is required'),
  body('templateName').trim().isLength({ min: 1, max: 100 }).withMessage('Template name is required'),
  body('baseInvoiceData').isObject().withMessage('Invoice data is required'),
  body('frequency').isIn(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).withMessage('Valid frequency is required'),
  body('startDate').isISO8601().toDate().withMessage('Valid start date is required'),
  body('endDate').optional().isISO8601().toDate()
    .withMessage('Valid end date is required if provided'),
  body('occurrences').optional().isInt({ min: 1 }).withMessage('Occurrences must be at least 1 if provided'),
];

// Routes
router.get('/', recurringController.getTemplates);
router.get('/:id', recurringController.getTemplate);
router.post('/', recurringValidation, recurringController.createTemplate);
router.put('/:id', recurringValidation, recurringController.updateTemplate);
router.delete('/:id', recurringController.deleteTemplate);
router.post('/:id/generate', recurringController.generateInvoice);

module.exports = router;
