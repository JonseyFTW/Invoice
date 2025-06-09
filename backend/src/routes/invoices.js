const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body } = require('express-validator');
const invoiceController = require('../controllers/invoiceController');
const auth = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Ensure invoice photos directory exists
const invoicePhotosDir = path.join(process.cwd(), 'uploads', 'invoice_photos');
if (!fs.existsSync(invoicePhotosDir)) {
  fs.mkdirSync(invoicePhotosDir, { recursive: true });
}

// Configure multer for invoice photo uploads
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, invoicePhotosDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `invoice-${req.params.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const photoUpload = multer({
  storage: photoStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files (JPEG, JPG, PNG, WebP) are allowed'));
  },
});

// Validation rules
const invoiceValidation = [
  body('customerId').isUUID().withMessage('Valid customer ID is required'),
  body('invoiceDate').isISO8601().toDate().withMessage('Valid invoice date is required'),
  body('dueDate').isISO8601().toDate().withMessage('Valid due date is required'),
  body('taxRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
  body('lineItems').isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('lineItems.*.description').trim().isLength({ min: 1 }).withMessage('Line item description is required'),
  body('lineItems.*.quantity').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0'),
  body('lineItems.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be 0 or greater'),
];

// Routes
router.get('/', invoiceController.getInvoices);
router.get('/:id', invoiceController.getInvoice);
router.post('/', invoiceValidation, invoiceController.createInvoice);
router.put('/:id', invoiceValidation, invoiceController.updateInvoice);
router.delete('/:id', invoiceController.deleteInvoice);
router.patch('/:id/mark-paid', invoiceController.markAsPaid);
router.get('/:id/pdf', invoiceController.generatePDF);
router.post('/:id/send-email', invoiceController.sendEmail);

// Invoice Photos Routes
router.post('/:id/photos', photoUpload.single('photo'), invoiceController.uploadInvoicePhoto);
router.get('/:id/photos', invoiceController.getInvoicePhotos);
router.delete('/photos/:photoId', invoiceController.deleteInvoicePhoto);

module.exports = router;
