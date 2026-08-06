const express = require('express');
const router = express.Router();
const AuditLog = require('../models/auditLog');
const { authenticate: auth, authorize } = require('../middleware/auth');

router.get('/', auth, authorize('admin'), async (req, res) => {
    try {
        const { module: mod, action, userId, page = 1, limit = 30 } = req.query;
        const query = {};
        if (mod) query.module = mod;
        if (action) query.action = { $regex: action, $options: 'i' };
        if (userId) query.userId = userId;

        const total = await AuditLog.countDocuments(query);
        const logs = await AuditLog.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.json({ success: true, data: logs, total, page: Number(page), pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
