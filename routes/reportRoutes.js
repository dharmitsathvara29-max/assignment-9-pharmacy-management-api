const express = require('express');
const {
  getExpiringSoonReport,
  getLowStockReport,
  getInventorySummaryReport
} = require('../controllers/reportController');
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleGuard');

const router = express.Router();

// Role-based protection: Pharmacist & Admin can access inventory reports
router.get('/expiring-soon', authenticate, authorizeRoles('pharmacist', 'admin'), getExpiringSoonReport);
router.get('/low-stock', authenticate, authorizeRoles('pharmacist', 'admin'), getLowStockReport);
router.get('/summary', authenticate, authorizeRoles('pharmacist', 'admin'), getInventorySummaryReport);

module.exports = router;
