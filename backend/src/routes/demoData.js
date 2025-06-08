const express = require('express');
const demoDataController = require('../controllers/demoDataController');
const auth = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Demo data routes
router.post('/generate', demoDataController.generateDemoData);
router.delete('/clear', demoDataController.clearDemoData);

module.exports = router;
