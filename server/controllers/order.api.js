const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const Medicine = require('../models/medicine');
const Inventory = require('../models/inventory');
const Notification = require('../models/notification');
const AuditLog = require('../models/auditLog');
const { authenticate: auth, authorize } = require('../middleware/auth');

// GET /api/order
router.get('/', auth, authorize('admin', 'pharmacist'), async (req, res) => {
    try {
        const { search, status, page = 1, limit = 20, startDate, endDate } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { orderNo: { $regex: search, $options: 'i' } },
                { 'customer.name': { $regex: search, $options: 'i' } },
                { 'customer.phone': { $regex: search, $options: 'i' } }
            ];
        }
        if (status) query.status = status;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59');
        }

        const total = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .populate('createdBy', 'name role')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.json({ success: true, data: orders, total, page: Number(page), pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/order/:id
router.get('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('createdBy', 'name role');
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
        res.json({ success: true, data: order });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/order — Create order + deduct stock
router.post('/', auth, async (req, res) => {
    try {
        const { customer, items, discount = 0, tax = 0, notes, prescriptionId } = req.body;

        if (!customer || !customer.name) {
            return res.status(400).json({ success: false, message: 'Customer name is required.' });
        }
        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Order must have at least one item.' });
        }

        // Validate stock for all items
        const enrichedItems = [];
        let subtotal = 0;

        for (const item of items) {
            const medicine = await Medicine.findById(item.medicine);
            if (!medicine || !medicine.isActive) {
                return res.status(400).json({ success: false, message: `Medicine not found: ${item.medicine}` });
            }
            if (medicine.quantity < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${medicine.name}. Available: ${medicine.quantity}, Requested: ${item.quantity}`
                });
            }
            const itemTotal = medicine.price * item.quantity;
            subtotal += itemTotal;
            enrichedItems.push({
                medicine: medicine._id,
                medicineName: medicine.name,
                quantity: item.quantity,
                unitPrice: medicine.price,
                total: itemTotal
            });
        }

        const total = subtotal - discount + tax;

        // Create order
        const order = new Order({
            customer,
            items: enrichedItems,
            subtotal,
            discount,
            tax,
            total,
            notes,
            prescriptionId,
            createdBy: req.user.id,
            status: 'pending'
        });
        await order.save();

        // Deduct stock for each item
        for (const item of enrichedItems) {
            await Medicine.findByIdAndUpdate(item.medicine, {
                $inc: { quantity: -item.quantity },
                updatedAt: new Date()
            });
            const med = await Medicine.findById(item.medicine);
            await Inventory.create({
                medicine: item.medicine,
                medicineName: item.medicineName,
                transactionType: 'sale',
                quantity: -item.quantity,
                balanceAfter: med.quantity,
                reference: order.orderNo,
                notes: `Order ${order.orderNo}`,
                createdBy: req.user.id
            });
            // Check low stock after deduction
            if (med.quantity <= med.reorderLevel) {
                const exists = await Notification.findOne({ type: 'low_stock', relatedId: med._id, isRead: false });
                if (!exists) {
                    await Notification.create({
                        title: 'Low Stock Alert',
                        message: `${med.name} is running low. Stock: ${med.quantity}`,
                        type: 'low_stock',
                        relatedId: med._id
                    });
                }
            }
        }

        // New order notification
        await Notification.create({
            title: 'New Order Created',
            message: `Order ${order.orderNo} placed for ${customer.name}. Total: ₹${total.toFixed(2)}`,
            type: 'new_order',
            relatedId: order._id
        });

        await AuditLog.create({
            action: 'create_order',
            module: 'order',
            userId: req.user.id,
            userName: req.user.name,
            details: `Created order ${order.orderNo} for ${customer.name}`
        });

        res.status(201).json({ success: true, message: 'Order created successfully.', data: order });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/order/:id/status — Update order status
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status, notes } = req.body;
        const validStatuses = ['pending', 'processing', 'packed', 'dispatched', 'delivered', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status.' });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status, updatedAt: new Date(), ...(notes && { notes }) },
            { new: true }
        );
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        if (status === 'delivered') {
            await Notification.create({
                title: 'Order Delivered',
                message: `Order ${order.orderNo} for ${order.customer.name} has been delivered.`,
                type: 'order_completed',
                relatedId: order._id
            });
        }

        await AuditLog.create({
            action: 'update_order_status',
            module: 'order',
            userId: req.user.id,
            userName: req.user.name,
            details: `Order ${order.orderNo} status changed to ${status}`
        });

        res.json({ success: true, message: 'Order status updated.', data: order });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/order/:id (cancel)
router.delete('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
        if (order.status === 'delivered') {
            return res.status(400).json({ success: false, message: 'Cannot cancel a delivered order.' });
        }

        // Restore stock if order was not already cancelled
        if (order.status !== 'cancelled') {
            for (const item of order.items) {
                await Medicine.findByIdAndUpdate(item.medicine, {
                    $inc: { quantity: item.quantity },
                    updatedAt: new Date()
                });
                const med = await Medicine.findById(item.medicine);
                await Inventory.create({
                    medicine: item.medicine,
                    medicineName: item.medicineName,
                    transactionType: 'return',
                    quantity: item.quantity,
                    balanceAfter: med.quantity,
                    reference: order.orderNo,
                    notes: `Cancelled order ${order.orderNo} — stock restored`,
                    createdBy: req.user.id
                });
            }
        }

        order.status = 'cancelled';
        order.updatedAt = new Date();
        await order.save();

        res.json({ success: true, message: 'Order cancelled and stock restored.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
