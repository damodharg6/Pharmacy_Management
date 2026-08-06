const express = require('express');
const router = express.Router();
const Medicine = require('../models/medicine');
const Order = require('../models/order');
const Inventory = require('../models/inventory');
const User = require('../models/user');
const Prescription = require('../models/prescription');
const Supplier = require('../models/supplierDetails');
const { authenticate: auth, authorize } = require('../middleware/auth');

// GET /api/report/medicines
router.get('/medicines', auth, authorize('admin', 'pharmacist'), async (req, res) => {
    try {
        const medicines = await Medicine.find({ isActive: true })
            .populate('category', 'name')
            .sort({ name: 1 });
        res.json({ success: true, data: medicines });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/report/inventory
router.get('/inventory', auth, async (req, res) => {
    try {
        const { startDate, endDate, type } = req.query;
        const query = {};
        if (type) query.transactionType = type;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59');
        }
        const transactions = await Inventory.find(query)
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .limit(500);
        res.json({ success: true, data: transactions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/report/sales
router.get('/sales', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const query = { status: { $ne: 'cancelled' } };
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59');
        }
        const orders = await Order.find(query)
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        const summary = {
            totalOrders: orders.length,
            totalRevenue: orders.reduce((s, o) => s + o.total, 0),
            totalDiscount: orders.reduce((s, o) => s + o.discount, 0)
        };

        res.json({ success: true, data: orders, summary });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/report/users
router.get('/users', auth, async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ role: 1, name: 1 });
        res.json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/report/prescriptions
router.get('/prescriptions', auth, async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;
        const query = {};
        if (status) query.status = status;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59');
        }
        const prescriptions = await Prescription.find(query)
            .populate('doctor', 'name')
            .populate('dispensedBy', 'name')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: prescriptions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/report/suppliers
router.get('/suppliers', auth, async (req, res) => {
    try {
        const suppliers = await Supplier.find({ isActive: true }).sort({ name: 1 });
        res.json({ success: true, data: suppliers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
