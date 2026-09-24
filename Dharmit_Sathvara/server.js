const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config(); // Fallback to cwd .env
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());

// Base Health Check Route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Pharmacy & Healthcare Store API is running',
    version: '1.0.0',
    documentation: {
      auth: '/api/auth',
      medicines: '/api/medicines',
      orders: '/api/orders',
      reports: '/api/reports'
    }
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);

  // Handle Bad JSON Request Body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload in request body'
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5001;

// Only start the server if not imported by test suites
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Pharmacy API running on http://localhost:${PORT}`);
    });
  });
}

module.exports = app;
