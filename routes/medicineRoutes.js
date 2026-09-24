const express = require('express');
const {
  getMedicines,
  getMedicineById,
  getExpiringMedicines,
  addMedicine,
  updateMedicine,
  deleteMedicine
} = require('../controllers/medicineController');
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleGuard');

const router = express.Router();

// Public routes
router.get('/', getMedicines);

// Expiring drugs query (Pharmacist / Admin) - Defined BEFORE /:id
router.get('/expiring', authenticate, authorizeRoles('pharmacist', 'admin'), getExpiringMedicines);

// Single medicine view (Public)
router.get('/:id', getMedicineById);

// Staff inventory management (Pharmacist / Admin)
router.post('/', authenticate, authorizeRoles('pharmacist', 'admin'), addMedicine);
router.put('/:id', authenticate, authorizeRoles('pharmacist', 'admin'), updateMedicine);

// Admin-only drug deletion
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteMedicine);

module.exports = router;
