const Medicine = require('../models/Medicine');

// @desc    Query drugs expiring in the next 30 days using MongoDB Aggregation
// @route   GET /api/reports/expiring-soon
// @access  Pharmacist / Admin
const getExpiringSoonReport = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const report = await Medicine.aggregate([
      {
        $match: {
          expiryDate: { $gte: now, $lte: futureDate }
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
      reportType: 'expiring-soon',
      windowDays: days,
      count: report.length,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Could not generate expiring soon report',
      error: error.message
    });
  }
};

// @desc    Query low-stock inventory alert using MongoDB Aggregation
// @route   GET /api/reports/low-stock
// @access  Pharmacist / Admin
const getLowStockReport = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 10;

    const report = await Medicine.aggregate([
      {
        $match: {
          stockQuantity: { $lte: threshold }
        }
      },
      {
        $addFields: {
          stockStatus: {
            $cond: {
              if: { $eq: ['$stockQuantity', 0] },
              then: 'OUT_OF_STOCK',
              else: 'LOW_STOCK'
            }
          }
        }
      },
      {
        $sort: { stockQuantity: 1 }
      }
    ]);

    res.json({
      success: true,
      reportType: 'low-stock-alert',
      threshold,
      count: report.length,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Could not generate low stock report',
      error: error.message
    });
  }
};

// @desc    Get inventory summary analytics
// @route   GET /api/reports/summary
// @access  Pharmacist / Admin
const getInventorySummaryReport = async (req, res) => {
  try {
    const summary = await Medicine.aggregate([
      {
        $group: {
          _id: null,
          totalMedicines: { $sum: 1 },
          totalStockQuantity: { $sum: '$stockQuantity' },
          totalInventoryValue: { $sum: { $multiply: ['$price', '$stockQuantity'] } },
          avgPrice: { $avg: '$price' }
        }
      },
      {
        $project: {
          _id: 0,
          totalMedicines: 1,
          totalStockQuantity: 1,
          totalInventoryValue: { $round: ['$totalInventoryValue', 2] },
          avgPrice: { $round: ['$avgPrice', 2] }
        }
      }
    ]);

    res.json({
      success: true,
      reportType: 'inventory-summary',
      data: summary[0] || {
        totalMedicines: 0,
        totalStockQuantity: 0,
        totalInventoryValue: 0,
        avgPrice: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Could not generate inventory summary',
      error: error.message
    });
  }
};

module.exports = {
  getExpiringSoonReport,
  getLowStockReport,
  getInventorySummaryReport
};
