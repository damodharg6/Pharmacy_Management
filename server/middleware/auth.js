const jwt = require('jsonwebtoken');
const TokenBlacklist = require('../models/tokenBlacklist');
const AuditLog = require('../models/auditLog');
const JWT_SECRET = process.env.JWT_SECRET;

async function authenticate(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    try {
        const isBlacklisted = await TokenBlacklist.findOne({ token });
        if (isBlacklisted) {
            return res.status(401).json({ success: false, message: 'Session invalidated. Please log in again.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        req.token = token;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
}

function authorize(...allowedRoles) {
    const roles = allowedRoles.flat().map(r => String(r).toLowerCase());
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }
        const userRole = req.user.role ? req.user.role.toLowerCase() : '';
        if (roles.length > 0 && !roles.includes(userRole)) {
            AuditLog.create({
                action: 'unauthorized_access',
                module: 'security',
                userId: req.user.id,
                userName: req.user.name,
                userRole: req.user.role,
                details: `Attempted forbidden access to ${req.originalUrl || req.url}`,
                status: 'forbidden',
                ipAddress: req.ip
            }).catch(() => {});

            return res.status(403).json({ success: false, message: 'Access denied. Unauthorized role.' });
        }
        next();
    };
}

module.exports = authenticate;
module.exports.authenticate = authenticate;
module.exports.authorize = authorize;


