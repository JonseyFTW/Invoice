const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body } = require('express-validator');
const customerController = require('../controllers/customerController');
const auth = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Ensure customer photos directory exists
const customerPhotosDir = path.join(process.cwd(), 'uploads', 'customer_photos');
if (!fs.existsSync(customerPhotosDir)) {
  fs.mkdirSync(customerPhotosDir, { recursive: true });
}

// Configure multer for customer photo uploads
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, customerPhotosDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `customer-${req.params.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const photoUpload = multer({
  storage: photoStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, JPG, PNG, WebP) are allowed'));
    }
  }
});

// Validation rules
const customerValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be less than 100 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('phone').optional().matches(/^[\d\s\-\+\(\)\.]*$/).withMessage('Please enter a valid phone number')
];

const noteValidation = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('content').trim().isLength({ min: 1 }).withMessage('Content is required'),
  body('category').optional().isIn(['paint_codes', 'materials', 'preferences', 'access_info', 'special_instructions', 'job_history', 'other']).withMessage('Invalid category'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority')
];

// Basic Customer Routes
router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomer);
router.post('/', customerValidation, customerController.createCustomer);
router.put('/:id', customerValidation, customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

// Customer Photos Routes
router.post('/:id/photos', photoUpload.single('photo'), customerController.uploadCustomerPhoto);
router.get('/:id/photos', customerController.getCustomerPhotos);
router.delete('/photos/:photoId', customerController.deleteCustomerPhoto);

// Customer Notes Routes
router.post('/:id/notes', noteValidation, customerController.createCustomerNote);
router.get('/:id/notes', customerController.getCustomerNotes);
router.put('/notes/:noteId', noteValidation, customerController.updateCustomerNote);
router.delete('/notes/:noteId', customerController.deleteCustomerNote);

module.exports = router;