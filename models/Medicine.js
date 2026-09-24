const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  brand: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true }, // e.g., "Antibiotic", "Analgesic"
  dosageForm: { type: String, enum: ['Tablet', 'Capsule', 'Syrup', 'Injection'], required: true },
  price: { type: Number, required: true, min: 0 },
  stockQuantity: { type: Number, required: true, min: 0 },
  requiresPrescription: { type: Boolean, default: false },
  expiryDate: { type: Date, required: true }
}, { timestamps: true });

// Useful indexes for search, expiring stock, category filter and inventory queries
medicineSchema.index({ expiryDate: 1 });
medicineSchema.index({ category: 1 });
medicineSchema.index({ stockQuantity: 1 });

module.exports = mongoose.model('Medicine', medicineSchema);
