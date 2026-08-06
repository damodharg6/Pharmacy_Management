const express = require('express');
const router = express.Router();
const Prescription = require('../models/prescription');
const Medicine = require('../models/medicine');
const Inventory = require('../models/inventory');
const Notification = require('../models/notification');
const AuditLog = require('../models/auditLog');
const auth = require('../middleware/auth');

// GET /api/prescription
router.get('/', auth, async (req, res) => {
    try {
        const { search, status, doctor, page = 1, limit = 20 } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { prescriptionNo: { $regex: search, $options: 'i' } },
                { patientName: { $regex: search, $options: 'i' } },
                { doctorName: { $regex: search, $options: 'i' } }
            ];
        }
        if (status) query.status = status;
        if (doctor) query.doctor = doctor;

        const total = await Prescription.countDocuments(query);
        const prescriptions = await Prescription.find(query)
            .populate('doctor', 'name')
            .populate('dispensedBy', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.json({ success: true, data: prescriptions, total, page: Number(page), pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/prescription/:id
router.get('/:id', auth, async (req, res) => {
    try {
        const prescription = await Prescription.findById(req.params.id)
            .populate('doctor', 'name role')
            .populate('dispensedBy', 'name');
        if (!prescription) return res.status(404).json({ success: false, message: 'Prescription not found.' });
        res.json({ success: true, data: prescription });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/prescription
router.post('/', auth, async (req, res) => {
    try {
        const { patientName, patientAge, patientPhone, doctor, doctorName, diagnosis, medicines, notes } = req.body;

        if (!patientName || !patientAge) {
            return res.status(400).json({ success: false, message: 'Patient name and age are required.' });
        }

        const docId = doctor || req.user.id;
        const docName = doctorName || req.user.name;

        const prescription = new Prescription({
            patientName, patientAge, patientPhone, doctor: docId, doctorName: docName, diagnosis, medicines, notes
        });
        await prescription.save();

        await Notification.create({
            title: 'New Prescription',
            message: `New prescription for ${patientName} by ${doctorName || 'Doctor'}`,
            type: 'new_prescription',
            relatedId: prescription._id
        });

        await AuditLog.create({
            action: 'create_prescription',
            module: 'prescription',
            userId: req.user.id,
            userName: req.user.name,
            details: `Created prescription for ${patientName}`
        });

        res.status(201).json({ success: true, message: 'Prescription created.', data: prescription });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/prescription/:id
router.put('/:id', auth, async (req, res) => {
    try {
        const prescription = await Prescription.findById(req.params.id);
        if (!prescription) return res.status(404).json({ success: false, message: 'Prescription not found.' });
        if (prescription.status === 'dispensed') {
            return res.status(400).json({ success: false, message: 'Cannot edit a dispensed prescription.' });
        }

        Object.assign(prescription, req.body);
        await prescription.save();
        res.json({ success: true, message: 'Prescription updated.', data: prescription });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/prescription/:id/dispense — Dispense prescription + reduce stock
router.patch('/:id/dispense', auth, async (req, res) => {
    try {
        const prescription = await Prescription.findById(req.params.id);
        if (!prescription) return res.status(404).json({ success: false, message: 'Prescription not found.' });
        if (prescription.status === 'dispensed') {
            return res.status(400).json({ success: false, message: 'Prescription already dispensed.' });
        }

        // Validate stock for all medicines
        for (const item of prescription.medicines) {
            if (!item.medicine) continue;
            const med = await Medicine.findById(item.medicine);
            if (!med) continue;
            if (med.quantity < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${item.medicineName || med.name}. Available: ${med.quantity}`
                });
            }
        }

        // Deduct stock
        for (const item of prescription.medicines) {
            if (!item.medicine || !item.quantity) continue;
            await Medicine.findByIdAndUpdate(item.medicine, {
                $inc: { quantity: -item.quantity },
                updatedAt: new Date()
            });
            const med = await Medicine.findById(item.medicine);
            await Inventory.create({
                medicine: item.medicine,
                medicineName: item.medicineName || med.name,
                transactionType: 'dispense',
                quantity: -item.quantity,
                balanceAfter: med.quantity,
                reference: prescription.prescriptionNo,
                notes: `Dispensed via prescription ${prescription.prescriptionNo}`,
                createdBy: req.user.id
            });

            // Check low stock
            if (med.quantity <= med.reorderLevel) {
                const exists = await Notification.findOne({ type: 'low_stock', relatedId: med._id, isRead: false });
                if (!exists) {
                    await Notification.create({
                        title: 'Low Stock Alert',
                        message: `${med.name} stock: ${med.quantity} (below threshold)`,
                        type: 'low_stock', relatedId: med._id
                    });
                }
            }
        }

        prescription.status = 'dispensed';
        prescription.dispensedBy = req.user.id;
        prescription.dispensedAt = new Date();
        await prescription.save();

        await AuditLog.create({
            action: 'dispense_prescription',
            module: 'prescription',
            userId: req.user.id,
            userName: req.user.name,
            details: `Dispensed prescription ${prescription.prescriptionNo} for ${prescription.patientName}`
        });

        res.json({ success: true, message: 'Prescription dispensed and stock updated.', data: prescription });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/prescription/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const prescription = await Prescription.findById(req.params.id);
        if (!prescription) return res.status(404).json({ success: false, message: 'Prescription not found.' });
        if (prescription.status === 'dispensed') {
            return res.status(400).json({ success: false, message: 'Cannot delete a dispensed prescription.' });
        }
        prescription.status = 'cancelled';
        await prescription.save();
        res.json({ success: true, message: 'Prescription cancelled.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;