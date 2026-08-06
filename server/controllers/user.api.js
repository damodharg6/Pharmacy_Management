const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const AuditLog = require('../models/auditLog');
const Notification = require('../models/notification');
const { authenticate: auth, authorize } = require('../middleware/auth');

// GET /api/user — List all users with search, filter, pagination
router.get('/', auth, authorize('admin'), async (req, res) => {
    try {
        const { search, role, isActive, page = 1, limit = 20 } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { nic: { $regex: search, $options: 'i' } },
                { number: { $regex: search, $options: 'i' } }
            ];
        }
        if (role) query.role = role;
        if (isActive !== undefined) query.isActive = isActive === 'true';

        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.json({ success: true, data: users, total, page: Number(page), pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/user/:id
router.get('/:id', auth, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        res.json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

function validatePasswordStrength(password) {
    if (!password || password.length < 8) {
        return 'Password must be at least 8 characters long.';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must contain at least one uppercase letter.';
    }
    if (!/[a-z]/.test(password)) {
        return 'Password must contain at least one lowercase letter.';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password must contain at least one number.';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return 'Password must contain at least one special character.';
    }
    return null;
}

// POST /api/user — Create user
router.post('/', auth, authorize('admin'), async (req, res) => {
    try {
        const { name, email, nic, number, role, password, address } = req.body;

        // Validation
        if (!name || !email || !nic || !number || !role || !password) {
            return res.status(400).json({ success: false, message: 'All required fields must be filled.' });
        }

        const passwordErr = validatePasswordStrength(password);
        if (passwordErr) {
            return res.status(400).json({ success: false, message: passwordErr });
        }

        // Duplicate check
        const existing = await User.findOne({ $or: [{ email: email.toLowerCase().trim() }, { nic }] });
        if (existing) {
            const field = existing.email === email.toLowerCase().trim() ? 'email' : 'NIC';
            return res.status(400).json({ success: false, message: `A user with this ${field} already exists.` });
        }

        const user = new User({ name, email: email.toLowerCase().trim(), nic, number, role, password, address });
        await user.save();

        // Audit log
        await AuditLog.create({
            action: 'create_user',
            module: 'user',
            userId: req.user.id,
            userName: req.user.name,
            userRole: req.user.role,
            details: `Created user: ${name} (${role})`
        });

        // Notification
        await Notification.create({
            title: 'New User Added',
            message: `${name} (${role}) has been added to the system.`,
            type: 'new_user'
        });

        res.status(201).json({ success: true, message: 'User created successfully.', data: { id: user._id, name: user.name } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/user/:id — Update user
router.put('/:id', auth, authorize('admin'), async (req, res) => {
    try {
        const { name, email, nic, number, role, password, address, isActive } = req.body;
        const updateData = { name, email, nic, number, role, address, isActive, updatedAt: new Date() };

        // If password provided, validate & hash it
        if (password) {
            const passwordErr = validatePasswordStrength(password);
            if (passwordErr) {
                return res.status(400).json({ success: false, message: passwordErr });
            }
            updateData.password = await bcrypt.hash(password, 10);
        }

        // Duplicate check (exclude self)
        if (email || nic) {
            const existing = await User.findOne({
                _id: { $ne: req.params.id },
                $or: [{ email: email ? email.toLowerCase() : null }, { nic }].filter(o => Object.values(o)[0])
            });
            if (existing) {
                return res.status(400).json({ success: false, message: 'Email or NIC already in use by another user.' });
            }
        }

        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        await AuditLog.create({
            action: 'update_user',
            module: 'user',
            userId: req.user.id,
            userName: req.user.name,
            userRole: req.user.role,
            details: `Updated user: ${user.name}`
        });

        res.json({ success: true, message: 'User updated successfully.', data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/user/:id/activate
router.patch('/:id/activate', auth, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { isActive: true, status: 'active' }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        await AuditLog.create({ action: 'activate_user', module: 'user', userId: req.user.id, userName: req.user.name, details: `Activated: ${user.name}` });
        res.json({ success: true, message: 'User activated.', data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/user/:id/deactivate
router.patch('/:id/deactivate', auth, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { isActive: false, status: 'inactive' }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        await AuditLog.create({ action: 'deactivate_user', module: 'user', userId: req.user.id, userName: req.user.name, details: `Deactivated: ${user.name}` });
        res.json({ success: true, message: 'User deactivated.', data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/user/:id
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
    try {
        // Prevent self-deletion
        if (req.params.id === req.user.id) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
        }
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        await AuditLog.create({ action: 'delete_user', module: 'user', userId: req.user.id, userName: req.user.name, details: `Deleted user: ${user.name}` });
        res.json({ success: true, message: 'User deleted successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;