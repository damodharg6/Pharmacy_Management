const express = require('express');
const router = express.Router();
const Medicine = require('../models/medicine');
const Inventory = require('../models/inventory');
const Notification = require('../models/notification');
const AuditLog = require('../models/auditLog');
const { authenticate: auth, authorize } = require('../middleware/auth');

// GET /api/medicine
router.get('/', auth, async (req, res) => {
    try {
        const { search, category, lowStock, page = 1, limit = 20 } = req.query;
        const query = { isActive: true };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { genericName: { $regex: search, $options: 'i' } },
                { batchNumber: { $regex: search, $options: 'i' } },
                { barcode: { $regex: search, $options: 'i' } }
            ];
        }
        if (category) query.category = category;
        if (lowStock === 'true') {
            query.$expr = { $lte: ['$quantity', '$reorderLevel'] };
        }

        const total = await Medicine.countDocuments(query);
        const medicines = await Medicine.find(query)
            .populate('category', 'name')
            .sort({ name: 1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.json({ success: true, data: medicines, total, page: Number(page), pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/medicine/low-stock
router.get('/low-stock', auth, async (req, res) => {
    try {
        const medicines = await Medicine.find({
            isActive: true,
            $expr: { $lte: ['$quantity', '$reorderLevel'] }
        }).populate('category', 'name').sort({ quantity: 1 });
        res.json({ success: true, data: medicines });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/medicine/:id
router.get('/:id', auth, async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id).populate('category', 'name');
        if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found.' });
        res.json({ success: true, data: medicine });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/medicine
router.post('/', auth, authorize('admin', 'pharmacist'), async (req, res) => {
    try {
        const { name, genericName, category, manufacturer, unit, price, costPrice, quantity, reorderLevel, batchNumber, expiryDate, barcode, description } = req.body;

        if (!name || !category || price === undefined) {
            return res.status(400).json({ success: false, message: 'Name, category and price are required.' });
        }

        const medicine = new Medicine({
            name, genericName, category, manufacturer, unit, price, costPrice,
            quantity: quantity || 0, reorderLevel: reorderLevel || 10,
            batchNumber, expiryDate, barcode, description, createdBy: req.user.id
        });
        await medicine.save();

        // Record initial stock if quantity > 0
        if (quantity > 0) {
            await Inventory.create({
                medicine: medicine._id,
                medicineName: medicine.name,
                transactionType: 'purchase',
                quantity: quantity,
                balanceAfter: quantity,
                reference: 'Initial stock',
                notes: 'Initial stock entry',
                createdBy: req.user.id
            });
        }

        // Check low stock
        await checkLowStock(medicine);

        await AuditLog.create({ action: 'create_medicine', module: 'medicine', userId: req.user.id, userName: req.user.name, details: `Created: ${name}` });

        res.status(201).json({ success: true, message: 'Medicine created successfully.', data: medicine });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/medicine/:id
router.put('/:id', auth, authorize('admin', 'pharmacist'), async (req, res) => {
    try {
        const { name, genericName, category, manufacturer, unit, price, costPrice, reorderLevel, batchNumber, expiryDate, barcode, description } = req.body;

        const medicine = await Medicine.findByIdAndUpdate(
            req.params.id,
            { name, genericName, category, manufacturer, unit, price, costPrice, reorderLevel, batchNumber, expiryDate, barcode, description, updatedAt: new Date() },
            { new: true }
        ).populate('category', 'name');

        if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found.' });

        await AuditLog.create({ action: 'update_medicine', module: 'medicine', userId: req.user.id, userName: req.user.name, details: `Updated: ${medicine.name}` });

        res.json({ success: true, message: 'Medicine updated.', data: medicine });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/medicine/:id/stock — Adjust stock
router.patch('/:id/stock', auth, authorize('admin', 'pharmacist'), async (req, res) => {
    try {
        const { quantity, transactionType, notes, reference } = req.body;

        if (quantity === undefined || !transactionType) {
            return res.status(400).json({ success: false, message: 'Quantity and transaction type required.' });
        }

        const medicine = await Medicine.findById(req.params.id);
        if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found.' });

        const newQty = medicine.quantity + Number(quantity);
        if (newQty < 0) {
            return res.status(400).json({ success: false, message: `Insufficient stock. Available: ${medicine.quantity}` });
        }

        medicine.quantity = newQty;
        medicine.updatedAt = new Date();
        await medicine.save();

        await Inventory.create({
            medicine: medicine._id,
            medicineName: medicine.name,
            transactionType,
            quantity: Number(quantity),
            balanceAfter: newQty,
            reference,
            notes,
            createdBy: req.user.id
        });

        await checkLowStock(medicine);

        res.json({ success: true, message: 'Stock updated.', data: { quantity: medicine.quantity } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/medicine/:id (soft delete)
router.delete('/:id', auth, authorize('admin', 'pharmacist'), async (req, res) => {
    try {
        const medicine = await Medicine.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found.' });
        await AuditLog.create({ action: 'delete_medicine', module: 'medicine', userId: req.user.id, userName: req.user.name, details: `Deleted: ${medicine.name}` });
        res.json({ success: true, message: 'Medicine deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Helper: check and create low stock notification
async function checkLowStock(medicine) {
    if (medicine.quantity <= medicine.reorderLevel) {
        const exists = await Notification.findOne({
            type: 'low_stock',
            relatedId: medicine._id,
            isRead: false
        });
        if (!exists) {
            await Notification.create({
                title: 'Low Stock Alert',
                message: `${medicine.name} is running low. Current stock: ${medicine.quantity} (Threshold: ${medicine.reorderLevel})`,
                type: 'low_stock',
                relatedId: medicine._id
            });
        }
    }
}

module.exports = router;
