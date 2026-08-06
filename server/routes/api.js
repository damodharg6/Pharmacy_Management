const express = require('express');
const router = express.Router();

// Auth
router.use('/auth', require('../controllers/auth.api'));

// User management
router.use('/user', require('../controllers/user.api'));

// Medicine & Category
router.use('/medicine', require('../controllers/medicine.api'));
router.use('/category', require('../controllers/category.api'));

// Suppliers
router.use('/supplier', require('../controllers/supplier.api'));

// Orders
router.use('/order', require('../controllers/order.api'));

// Prescriptions & Patients
router.use('/prescription', require('../controllers/prescription.api'));
router.use('/patient', require('../controllers/patient.api'));

// Dashboard
router.use('/dashboard', require('../controllers/dashboard.api'));

// Notifications
router.use('/notification', require('../controllers/notification.api'));

// Reports
router.use('/report', require('../controllers/report.api'));

// Audit logs
router.use('/audit', require('../controllers/audit.api'));

// Legacy routes (keep for backward compatibility)
router.use('/drugAS', require('../controllers/drug.apiAS.js'));
router.use('/drug', require('../controllers/drug.api'));
router.use('/email', require('../controllers/email.api'));
router.use('/request', require('../controllers/request.api'));

module.exports = router;