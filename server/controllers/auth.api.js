const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const AuditLog = require('../models/auditLog');

const TokenBlacklist = require('../models/tokenBlacklist');

const JWT_SECRET = process.env.JWT_SECRET;

// In-memory brute-force tracker: Map<key, { count, lockUntil }>
const failedAttemptsMap = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

function getTrackerKey(email, ip) {
    return `${(email || '').toLowerCase().trim()}_${ip || ''}`;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid input format.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const trackerKey = getTrackerKey(normalizedEmail, req.ip);
        const tracker = failedAttemptsMap.get(trackerKey) || { count: 0, lockUntil: 0 };

        // Check if locked out
        if (tracker.lockUntil && tracker.lockUntil > Date.now()) {
            await AuditLog.create({
                action: 'login_lockout',
                module: 'auth',
                details: `Locked out login attempt for ${normalizedEmail}`,
                ipAddress: req.ip,
                status: 'blocked'
            }).catch(() => {});

            return res.status(429).json({
                success: false,
                message: 'Too many failed login attempts. Please try again after 15 minutes.'
            });
        }

        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            tracker.count += 1;
            if (tracker.count >= MAX_FAILED_ATTEMPTS) {
                tracker.lockUntil = Date.now() + LOCK_TIME_MS;
            }
            failedAttemptsMap.set(trackerKey, tracker);

            await AuditLog.create({
                action: 'login_failed',
                module: 'auth',
                details: `Invalid email or user not found: ${normalizedEmail}`,
                ipAddress: req.ip,
                status: 'failure'
            }).catch(() => {});

            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        if (!user.isActive || user.status === 'inactive') {
            return res.status(403).json({ success: false, message: 'Account is inactive. Please contact administration.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            tracker.count += 1;
            if (tracker.count >= MAX_FAILED_ATTEMPTS) {
                tracker.lockUntil = Date.now() + LOCK_TIME_MS;
                await AuditLog.create({
                    action: 'login_lockout',
                    module: 'auth',
                    userId: user._id,
                    userName: user.name,
                    userRole: user.role,
                    details: `Account locked out for 15 minutes after 5 failed attempts (${normalizedEmail})`,
                    ipAddress: req.ip,
                    status: 'blocked'
                }).catch(() => {});
            } else {
                await AuditLog.create({
                    action: 'login_failed',
                    module: 'auth',
                    userId: user._id,
                    userName: user.name,
                    userRole: user.role,
                    details: `Failed password attempt for ${normalizedEmail}`,
                    ipAddress: req.ip,
                    status: 'failure'
                }).catch(() => {});
            }
            failedAttemptsMap.set(trackerKey, tracker);

            if (tracker.lockUntil && tracker.lockUntil > Date.now()) {
                return res.status(429).json({
                    success: false,
                    message: 'Too many failed login attempts. Please try again after 15 minutes.'
                });
            }

            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        // Success: Reset brute-force counter
        failedAttemptsMap.delete(trackerKey);

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role, name: user.name },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Audit log
        await AuditLog.create({
            action: 'login',
            module: 'auth',
            userId: user._id,
            userName: user.name,
            userRole: user.role,
            details: 'User logged in successfully',
            ipAddress: req.ip,
            status: 'success'
        });

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status || (user.isActive ? 'active' : 'inactive'),
                isActive: user.isActive,
                phone: user.phone || user.number || ''
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            // Blacklist token server-side
            await TokenBlacklist.create({ token }).catch(() => {});

            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                await AuditLog.create({
                    action: 'logout',
                    module: 'auth',
                    userId: decoded.id,
                    userName: decoded.name,
                    userRole: decoded.role,
                    details: 'User logged out and session revoked',
                    ipAddress: req.ip,
                    status: 'success'
                });
            } catch (e) { /* ignore expired token on logout */ }
        }

        res.json({ success: true, message: 'Logged out successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Logout error.' });
    }
});

// GET /api/auth/me - Get current user
router.get('/me', require('../middleware/auth'), async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
