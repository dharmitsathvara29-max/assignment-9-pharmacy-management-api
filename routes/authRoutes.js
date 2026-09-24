const express = require('express');
const { register, registerStaff, login, profile } = require('../controllers/authController');
const authenticate = require('../middleware/auth');
const router = express.Router();
router.post('/register', register);
router.post('/register-staff', registerStaff);
router.post('/login', login);
router.get('/profile', authenticate, profile);
module.exports = router;
