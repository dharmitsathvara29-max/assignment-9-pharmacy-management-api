const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');

// @desc    List medicines with optional search & category filter
// @route   GET /api/medicines
// @access  Public
const getMedicines = async (req, res) => {
  try {
    const { search, category, dosageForm, requiresPrescription } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { brand: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (category) {
      filter.category = { $regex: `^${category.trim()}$`, $options: 'i' };
    }

    if (dosageForm) {
      filter.dosageForm = dosageForm.trim();
    }

    if (requiresPrescription !== undefined) {
      filter.requiresPrescription = requiresPrescription === 'true';
    }

    const medicines = await Medicine.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: medicines.length,
      medicines
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Could not fetch medicines',
      error: error.message
    });
  }
};

// @desc    Get single medicine details by ID
// @route   GET /api/medicines/:id
// @access  Public
const getMedicineById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID format'
      });
    }

    const medicine = await Medicine.findById(id);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found'
      });
    }

    res.json({
      success: true,
      medicine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Could not fetch medicine',
      error: error.message
    });
  }
};

// @desc    Query drugs expiring in the next 30 days using MongoDB Aggregation
// @route   GET /api/medicines/expiring
// @access  Pharmacist / Admin
const getExpiringMedicines = async (req, res) => {
  try {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const medicines = await Medicine.aggregate([
      {
        $match: {
          expiryDate: { $gte: now, $lte: in30Days }
        }
      },
      {
        $addFields: {
          daysRemaining: {
            $round: [
              { $divide: [{ $subtract: ['$expiryDate', now] }, 1000 * 60 * 60 * 24] },
              1
            ]
          }
        }
      },
      {
        $sort: { expiryDate: 1 }
      }
    ]);

    res.json({
      success: true,
      count: medicines.length,
      medicines
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Could not fetch expiring medicines',
      error: error.message
    });
  }
};

// @desc    Add new medicine
// @route   POST /api/medicines
// @access  Pharmacist / Admin
const addMedicine = async (req, res) => {
  try {
    const { name, brand, category, dosageForm, price, stockQuantity, requiresPrescription, expiryDate } = req.body;

    if (!name || !brand || !category || !dosageForm || price === undefined || stockQuantity === undefined || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, brand, category, dosageForm, price, stockQuantity, expiryDate'
      });
    }

    const validForms = ['Tablet', 'Capsule', 'Syrup', 'Injection'];
    if (!validForms.includes(dosageForm)) {
      return res.status(400).json({
        success: false,
        message: `dosageForm must be one of: ${validForms.join(', ')}`
      });
    }

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a number greater than or equal to 0'
      });
    }

    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'stockQuantity must be an integer greater than or equal to 0'
      });
    }

    const medicine = await Medicine.create({
      name: name.trim(),
      brand: brand.trim(),
      category: category.trim(),
      dosageForm,
      price,
      stockQuantity,
      requiresPrescription: Boolean(requiresPrescription),
      expiryDate: new Date(expiryDate)
    });

    res.status(201).json({
      success: true,
      message: 'Medicine added successfully',
      medicine
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Could not add medicine',
      error: error.message
    });
  }
};

// @desc    Update medicine stock or pricing
// @route   PUT /api/medicines/:id
// @access  Pharmacist / Admin
const updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID format'
      });
    }

    if (req.body.dosageForm) {
      const validForms = ['Tablet', 'Capsule', 'Syrup', 'Injection'];
      if (!validForms.includes(req.body.dosageForm)) {
        return res.status(400).json({
          success: false,
          message: `dosageForm must be one of: ${validForms.join(', ')}`
        });
      }
    }

    if (req.body.price !== undefined && (typeof req.body.price !== 'number' || req.body.price < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a number greater than or equal to 0'
      });
    }

    if (req.body.stockQuantity !== undefined && (!Number.isInteger(req.body.stockQuantity) || req.body.stockQuantity < 0)) {
      return res.status(400).json({
        success: false,
        message: 'stockQuantity must be an integer greater than or equal to 0'
      });
    }

    const medicine = await Medicine.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found'
      });
    }

    res.json({
      success: true,
      message: 'Medicine updated successfully',
      medicine
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Could not update medicine',
      error: error.message
    });
  }
};

// @desc    Delete medicine from database
// @route   DELETE /api/medicines/:id
// @access  Admin Only
const deleteMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID format'
      });
    }

    const medicine = await Medicine.findByIdAndDelete(id);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found'
      });
    }

    res.json({
      success: true,
      message: 'Medicine deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Could not delete medicine',
      error: error.message
    });
  }
};

module.exports = {
  getMedicines,
  getMedicineById,
  getExpiringMedicines,
  addMedicine,
  updateMedicine,
  deleteMedicine
};
