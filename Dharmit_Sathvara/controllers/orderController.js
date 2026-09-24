const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');
const Order = require('../models/Order');

// @desc    Place an order for medicines
// @route   POST /api/orders
// @access  Customer Only
const placeOrder = async (req, res) => {
  try {
    const { items, prescriptionNotes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items are required and must be a non-empty array'
      });
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      if (!item.medicine || !Number.isInteger(item.quantity) || item.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a valid medicine ID and an integer quantity of at least 1'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(item.medicine)) {
        return res.status(400).json({
          success: false,
          message: `Invalid medicine ID format: ${item.medicine}`
        });
      }

      const medicine = await Medicine.findById(item.medicine);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: `Medicine not found with ID: ${item.medicine}`
        });
      }

      // Check stock availability
      if (medicine.stockQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${medicine.name}". Requested: ${item.quantity}, Available: ${medicine.stockQuantity}`
        });
      }

      // Prescription verification flag check
      if (medicine.requiresPrescription) {
        if (!prescriptionNotes || !prescriptionNotes.trim()) {
          return res.status(400).json({
            success: false,
            message: `Prescription verification required: "${medicine.name}" requires a valid prescription notes.`
          });
        }
      }

      // Always use current server price to avoid client-side price tampering
      orderItems.push({
        medicine: medicine._id,
        quantity: item.quantity,
        unitPrice: medicine.price
      });

      totalAmount += medicine.price * item.quantity;
    }

    const order = await Order.create({
      customer: req.user.id,
      items: orderItems,
      totalAmount: Math.round(totalAmount * 100) / 100,
      prescriptionNotes: prescriptionNotes ? prescriptionNotes.trim() : undefined,
      status: 'pending'
    });

    const populated = await Order.findById(order._id)
      .populate('customer', 'name email role')
      .populate('items.medicine', 'name brand category price stockQuantity requiresPrescription');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Could not place order',
      error: error.message
    });
  }
};

// @desc    View customer's own order history
// @route   GET /api/orders/my-orders
// @access  Customer Only
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate('items.medicine', 'name brand category price dosageForm')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Could not fetch order history',
      error: error.message
    });
  }
};

// @desc    List all orders (with optional status filter)
// @route   GET /api/orders
// @access  Pharmacist / Admin
const getAllOrders = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status.trim().toLowerCase();
    }

    const orders = await Order.find(filter)
      .populate('customer', 'name email')
      .populate('items.medicine', 'name brand category price stockQuantity')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Could not fetch orders',
      error: error.message
    });
  }
};

// @desc    Get single order details by ID
// @route   GET /api/orders/:id
// @access  Authenticated (Customer for own order, Pharmacist / Admin for any)
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const order = await Order.findById(id)
      .populate('customer', 'name email role')
      .populate('items.medicine', 'name brand category price stockQuantity');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Customer can only view their own order
    if (req.user.role === 'customer' && order.customer._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view your own orders'
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Could not fetch order',
      error: error.message
    });
  }
};

// @desc    Update order status to approved/dispensed/cancelled (Atomic stock deduction upon approval)
// @route   PATCH /api/orders/:id/status
// @access  Pharmacist / Admin
const updateStatus = async (req, res) => {
  const { id } = req.params;
  let { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order ID format'
    });
  }

  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Status is required'
    });
  }

  status = status.trim().toLowerCase();
  // Support both 'rejected' and 'cancelled'
  if (status === 'rejected') {
    status = 'cancelled';
  }

  const validStatuses = ['approved', 'dispensed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`
    });
  }

  // Try using MongoDB Replica Set Session / Transaction
  let session = null;
  let useTransactions = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    useTransactions = true;
  } catch (_) {
    session = null;
    useTransactions = false;
  }

  try {
    const query = Order.findById(id);
    if (useTransactions && session) query.session(session);
    const order = await query;

    if (!order) {
      if (useTransactions && session) await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Terminal states cannot be changed
    if (order.status === 'cancelled') {
      if (useTransactions && session) await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Cannot update status. Order is already cancelled.'
      });
    }

    if (order.status === 'dispensed') {
      if (useTransactions && session) await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Cannot update status. Order has already been dispensed.'
      });
    }

    // Prevent redundant status updates
    if (order.status === status) {
      if (useTransactions && session) await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Order is already in '${status}' status`
      });
    }

    // 1. ATOMIC STOCK DEDUCTION:
    // Triggered when an order transitions from 'pending' to 'approved' (or directly 'dispensed')
    if ((status === 'approved' || status === 'dispensed') && order.status === 'pending') {
      const deductedMedicines = [];

      for (const item of order.items) {
        const updateOpts = { new: true };
        if (useTransactions && session) updateOpts.session = session;

        const medicine = await Medicine.findOneAndUpdate(
          { _id: item.medicine, stockQuantity: { $gte: item.quantity } },
          { $inc: { stockQuantity: -item.quantity } },
          updateOpts
        );

        if (!medicine) {
          // If transaction supported, abort
          if (useTransactions && session) {
            await session.abortTransaction();
          } else {
            // Manual rollback for non-transaction environments
            for (const rolled of deductedMedicines) {
              await Medicine.findByIdAndUpdate(rolled.id, { $inc: { stockQuantity: rolled.quantity } });
            }
          }

          return res.status(400).json({
            success: false,
            message: `Atomic stock deduction failed: Insufficient stock for medicine ID ${item.medicine}. No stock was deducted.`
          });
        }

        deductedMedicines.push({ id: item.medicine, quantity: item.quantity });
      }
    }

    // 2. STOCK RESTORATION:
    // If an approved order is cancelled, restore previously deducted stock
    if (status === 'cancelled' && order.status === 'approved') {
      for (const item of order.items) {
        const restoreOpts = {};
        if (useTransactions && session) restoreOpts.session = session;

        await Medicine.findByIdAndUpdate(
          item.medicine,
          { $inc: { stockQuantity: item.quantity } },
          restoreOpts
        );
      }
    }

    // Update the order status
    order.status = status;
    const saveOpts = {};
    if (useTransactions && session) saveOpts.session = session;
    await order.save(saveOpts);

    if (useTransactions && session) {
      await session.commitTransaction();
    }

    const updatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email role')
      .populate('items.medicine', 'name brand category price stockQuantity');

    res.json({
      success: true,
      message: `Order status successfully updated to '${status}'`,
      order: updatedOrder
    });
  } catch (error) {
    if (useTransactions && session) {
      try { await session.abortTransaction(); } catch (_) {}
    }
    res.status(500).json({
      success: false,
      message: 'Could not update order status',
      error: error.message
    });
  } finally {
    if (session) {
      try { await session.endSession(); } catch (_) {}
    }
  }
};

module.exports = {
  placeOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateStatus
};
