const express = require('express');
const router = express.Router();
const Supplier = require('../models/supplierDetails');
const Order = require('../models/order');
const AuditLog = require('../models/auditLog');
const { authenticate: auth, authorize } = require('../middleware/auth');

router.get('/', auth, authorize('admin', 'pharmacist'), async (req, res) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;
        const query = { isActive: true };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { city: { $regex: search, $options: 'i' } }
            ];
        }
        const total = await Supplier.countDocuments(query);
        const suppliers = await Supplier.find(query).sort({ name: 1 })
            .skip((page - 1) * limit).limit(Number(limit));
        res.json({ success: true, data: suppliers, total });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/:id', auth, authorize('admin', 'pharmacist'), async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found.' });
        res.json({ success: true, data: supplier });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/', auth, authorize('admin', 'pharmacist'), async (req, res) => {
    try {
        const { name, phone } = req.body;
        if (!name || !phone) return res.status(400).json({ success: false, message: 'Name and phone are required.' });
        const supplier = new Supplier(req.body);
        await supplier.save();
        await AuditLog.create({ action: 'create_supplier', module: 'supplier', userId: req.user.id, userName: req.user.name, details: `Created: ${name}` });
        res.status(201).json({ success: true, message: 'Supplier created.', data: supplier });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.put('/:id', auth, authorize('admin', 'pharmacist'), async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndUpdate(
            req.params.id, { ...req.body, updatedAt: new Date() }, { new: true }
        );
        if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found.' });
        await AuditLog.create({ action: 'update_supplier', module: 'supplier', userId: req.user.id, userName: req.user.name, details: `Updated: ${supplier.name}` });
        res.json({ success: true, message: 'Supplier updated.', data: supplier });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.delete('/:id', auth, authorize('admin', 'pharmacist'), async (req, res) => {
    try {
        await Supplier.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ success: true, message: 'Supplier deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
