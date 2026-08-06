const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Medicine = require('../models/medicine');
const Order = require('../models/order');
const Prescription = require('../models/prescription');
const Supplier = require('../models/supplierDetails');
const Notification = require('../models/notification');
const Inventory = require('../models/inventory');
const auth = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', auth, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const userRole = (req.user && req.user.role) ? req.user.role.toLowerCase() : '';

        if (userRole === 'doctor') {
            const [
                myPrescriptions,
                distinctPatients,
                totalMedicines,
                recentPrescriptions,
                unreadNotifications
            ] = await Promise.all([
                Prescription.countDocuments({ doctor: req.user.id }),
                Prescription.distinct('patientName', { doctor: req.user.id }),
                Medicine.countDocuments({ isActive: true }),
                Prescription.find({ doctor: req.user.id }).sort({ createdAt: -1 }).limit(5),
                Notification.countDocuments({ isRead: false })
            ]);

            return res.json({
                success: true,
                data: {
                    myPrescriptions,
                    activePatients: distinctPatients.length,
                    totalMedicines,
                    recentPrescriptions,
                    unreadNotifications
                }
            });
        }

        const [
            totalUsers,
            totalDoctors,
            totalPharmacists,
            totalMedicines,
            totalSuppliers,
            pendingOrders,
            completedOrders,
            todaySalesResult,
            lowStockMedicines,
            recentOrders,
            latestActivity,
            unreadNotifications
        ] = await Promise.all([
            User.countDocuments({ isActive: true }),
            User.countDocuments({ role: 'doctor', isActive: true }),
            User.countDocuments({ role: { $in: ['pharmacist', 'chief_pharmacist'] }, isActive: true }),
            Medicine.countDocuments({ isActive: true }),
            Supplier.countDocuments({ isActive: true }),
            Order.countDocuments({ status: 'pending' }),
            Order.countDocuments({ status: 'delivered' }),
            Order.aggregate([
                { $match: { createdAt: { $gte: today }, status: { $ne: 'cancelled' } } },
                { $group: { _id: null, total: { $sum: '$total' } } }
            ]),
            Medicine.countDocuments({ isActive: true, $expr: { $lte: ['$quantity', '$reorderLevel'] } }),
            Order.find({}).sort({ createdAt: -1 }).limit(5).select('orderNo customer.name total status createdAt'),
            Inventory.find({}).sort({ createdAt: -1 }).limit(10).select('medicineName transactionType quantity createdAt'),
            Notification.countDocuments({ isRead: false })
        ]);

        const todaySales = todaySalesResult.length > 0 ? todaySalesResult[0].total : 0;

        res.json({
            success: true,
            data: {
                totalUsers,
                totalDoctors,
                totalPharmacists,
                totalMedicines,
                totalSuppliers,
                pendingOrders,
                completedOrders,
                todaySales,
                lowStockMedicines,
                recentOrders,
                latestActivity,
                unreadNotifications
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/dashboard/chart - Sales chart data (last 7 days)
router.get('/chart', auth, async (req, res) => {
    try {
        const days = 7;
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const end = new Date(d);
            end.setHours(23, 59, 59, 999);

            const agg = await Order.aggregate([
                { $match: { createdAt: { $gte: d, $lte: end }, status: { $ne: 'cancelled' } } },
                { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
            ]);

            result.push({
                date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
                sales: agg.length > 0 ? agg[0].total : 0,
                orders: agg.length > 0 ? agg[0].count : 0
            });
        }
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
