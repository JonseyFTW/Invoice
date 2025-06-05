const express = require('express');
const multer = require('multer');
const path = require('path');
const { body } = require('express-validator');
const expenseController = require('../controllers/expenseController');
const auth = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/receipts/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `receipt-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, JPG, PNG) and PDF files are allowed'));
    }
  }
});

// Validation rules
const expenseValidation = [
  body('vendor').trim().isLength({ min: 1, max: 100 }).withMessage('Vendor name is required'),
  body('description').trim().isLength({ min: 1 }).withMessage('Description is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be 0 or greater'),
  body('expenseDate').isISO8601().toDate().withMessage('Valid expense date is required'),
  body('invoiceId').optional().isUUID().withMessage('Valid invoice ID is required if provided')
];

// Routes
router.get('/', expenseController.getExpenses);
router.get('/:id', expenseController.getExpense);
router.post('/', upload.single('receipt'), expenseValidation, expenseController.createExpense);
router.put('/:id', upload.single('receipt'), expenseValidation, expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);

module.exports = router;