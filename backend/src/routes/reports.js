const express = require('express');
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Routes
router.get('/summary', reportController.getSummary);
router.get('/monthly', reportController.getMonthlyData);
router.get('/top-customers', reportController.getTopCustomers);

module.exports = router;