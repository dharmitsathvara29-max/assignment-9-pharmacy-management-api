const express = require('express');
const {
  placeOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateStatus
} = require('../controllers/orderController');
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleGuard');

const router = express.Router();

// Customer only routes
router.post('/', authenticate, authorizeRoles('customer'), placeOrder);
router.get('/my-orders', authenticate, authorizeRoles('customer'), getMyOrders);

// Pharmacist & Admin routes
router.get('/', authenticate, authorizeRoles('pharmacist', 'admin'), getAllOrders);
router.patch('/:id/status', authenticate, authorizeRoles('pharmacist', 'admin'), updateStatus);

// Single order view (Customer can view own, Staff can view any)
router.get('/:id', authenticate, getOrderById);

module.exports = router;
