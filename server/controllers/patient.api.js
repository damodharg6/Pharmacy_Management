const express = require('express');
const router = express.Router();
const Patient = require('../models/patient');
const Prescription = require('../models/prescription');
const AuditLog = require('../models/auditLog');
const { authenticate: auth } = require('../middleware/auth');

// GET /api/patient — List patients with search
router.get('/', auth, async (req, res) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const total = await Patient.countDocuments(query);
        const patients = await Patient.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.json({ success: true, data: patients, total, page: Number(page), pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/patient/:id — Get patient details & prescription history
router.get('/:id', auth, async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });

        const prescriptions = await Prescription.find({
            $or: [{ patient: patient._id }, { patientName: patient.name }]
        }).sort({ createdAt: -1 });

        res.json({ success: true, data: { patient, prescriptions } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/patient — Create new patient
router.post('/', auth, async (req, res) => {
    try {
        const { name, age, gender, phone, email, address, medicalHistory, allergies } = req.body;

        if (!name || !age) {
            return res.status(400).json({ success: false, message: 'Patient name and age are required.' });
        }

        const patient = new Patient({
            name, age, gender, phone, email, address, medicalHistory, allergies, createdBy: req.user.id
        });
        await patient.save();

        await AuditLog.create({
            action: 'create_patient',
            module: 'patient',
            userId: req.user.id,
            userName: req.user.name,
            details: `Created patient record for ${name}`
        });

        res.status(201).json({ success: true, message: 'Patient registered successfully.', data: patient });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/patient/:id — Update patient details
router.put('/:id', auth, async (req, res) => {
    try {
        const patient = await Patient.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: new Date() },
            { new: true }
        );
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
        res.json({ success: true, message: 'Patient updated.', data: patient });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
