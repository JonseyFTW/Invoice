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

// Enhanced Analytics Routes
router.get('/revenue-analytics', reportController.getRevenueAnalytics);
router.get('/customer-profitability', reportController.getCustomerProfitability);
router.get('/invoice-aging', reportController.getInvoiceAging);
router.get('/geographic-distribution', reportController.getGeographicDistribution);
router.get('/service-metrics', reportController.getServiceMetrics);
router.get('/financial-health', reportController.getFinancialHealth);

// Export Routes
router.get('/export/csv', reportController.exportReportCSV);
router.get('/export/pdf', reportController.exportReportPDF);

module.exports = router;