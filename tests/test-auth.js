const http = require('http');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pharmacyManagementDB';
const JWT_SECRET = process.env.JWT_SECRET || 'pharmacy_jwt_secret_2024';

// Helper for making HTTP requests
function httpRequest(options, postData) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(body);
                } catch (e) {
                    parsed = body;
                }
                resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
            });
        });
        req.on('error', reject);
        if (postData) {
            req.write(typeof postData === 'object' ? JSON.stringify(postData) : postData);
        }
        req.end();
    });
}

async function runAuthTests() {
    console.log('====================================================');
    console.log('🧪 PHARMACY ERP AUTHENTICATION & ROLE TEST SUITE');
    console.log('====================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`  ✅ PASSED: ${message}`);
            passed++;
        } else {
            console.error(`  ❌ FAILED: ${message}`);
            failed++;
        }
    }

    try {
        // Test 1: Connect to DB and verify password hashing
        console.log('Test 1: Database & Password Hashing Verification');
        await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        const User = require('../server/models/user');
        
        const adminDb = await User.findOne({ email: 'admin@pharmacy.com' });
        assert(adminDb !== null, 'Admin user exists in database');
        assert(adminDb && adminDb.password.startsWith('$2'), 'Admin password is standard bcrypt hash');
        
        const isBcryptMatch = await bcrypt.compare('Admin@123', adminDb ? adminDb.password : '');
        assert(isBcryptMatch, 'bcrypt.compare correctly verifies Admin@123 password');

        // Test 2: Admin Login
        console.log('\nTest 2: Admin Login API (admin@pharmacy.com / Admin@123)');
        const adminRes = await httpRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'admin@pharmacy.com', password: 'Admin@123' });

        assert(adminRes.statusCode === 200, `Status code is 200 (got ${adminRes.statusCode})`);
        assert(adminRes.body.success === true, 'Response contains success: true');
        assert(typeof adminRes.body.token === 'string', 'JWT token received');
        assert(adminRes.body.user && adminRes.body.user.role === 'admin', 'User role returned as admin');

        // Test 3: Doctor Login
        console.log('\nTest 3: Doctor Login API (doctor@pharmacy.com / Doctor@123)');
        const doctorRes = await httpRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'doctor@pharmacy.com', password: 'Doctor@123' });

        assert(doctorRes.statusCode === 200, `Status code is 200 (got ${doctorRes.statusCode})`);
        assert(doctorRes.body.success === true, 'Response contains success: true');
        assert(doctorRes.body.user && doctorRes.body.user.role === 'doctor', 'User role returned as doctor');

        // Test 4: Pharmacist Login
        console.log('\nTest 4: Pharmacist Login API (pharmacist@pharmacy.com / Pharma@123)');
        const pharmaRes = await httpRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'pharmacist@pharmacy.com', password: 'Pharma@123' });

        assert(pharmaRes.statusCode === 200, `Status code is 200 (got ${pharmaRes.statusCode})`);
        assert(pharmaRes.body.success === true, 'Response contains success: true');
        assert(pharmaRes.body.user && pharmaRes.body.user.role === 'pharmacist', 'User role returned as pharmacist');

        // Test 5: Invalid Password Attempt
        console.log('\nTest 5: Invalid Password Error Handling');
        const invalidPassRes = await httpRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'admin@pharmacy.com', password: 'WrongPassword' });

        assert(invalidPassRes.statusCode === 401, `Status code is 401 (got ${invalidPassRes.statusCode})`);
        assert(invalidPassRes.body.success === false, 'Response contains success: false');
        assert(invalidPassRes.body.message === 'Invalid email or password.', 'Returns standard error message');

        // Test 6: Inactive User Account Attempt
        console.log('\nTest 6: Inactive User Account Block');
        await User.updateOne({ email: 'sarah.doctor@pharmacy.com' }, { isActive: false, status: 'inactive' });
        const inactiveRes = await httpRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'sarah.doctor@pharmacy.com', password: 'Doctor@123' });

        assert(inactiveRes.statusCode === 403, `Status code is 403 (got ${inactiveRes.statusCode})`);
        assert(inactiveRes.body.message === 'Account is inactive. Please contact administration.', 'Returns inactive user error message');
        await User.updateOne({ email: 'sarah.doctor@pharmacy.com' }, { isActive: true, status: 'active' });

        // Test 7: Protected Route & Session Validation
        console.log('\nTest 7: Session & JWT Bearer Header Verification');
        const unauthApiRes = await httpRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/user',
            method: 'GET'
        });
        assert(unauthApiRes.statusCode === 401, 'Unauthenticated GET /api/user returns 401 Access Denied');

        const authApiRes = await httpRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/user',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${adminRes.body.token}` }
        });
        assert(authApiRes.statusCode === 200, 'Authenticated Admin GET /api/user returns 200 OK with data');

        // Test 7.1: Doctor Authorization Restrictions
        console.log('\nTest 7.1: Doctor API Role Authorization Restrictions');
        const docUserRes = await httpRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/user',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${doctorRes.body.token}` }
        });
        assert(docUserRes.statusCode === 403, 'Doctor GET /api/user returns 403 Forbidden');

        const docAuditRes = await httpRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/audit',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${doctorRes.body.token}` }
        });
        assert(docAuditRes.statusCode === 403, 'Doctor GET /api/audit returns 403 Forbidden');

        const docSupplierRes = await httpRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/supplier',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${doctorRes.body.token}` }
        });
        assert(docSupplierRes.statusCode === 403, 'Doctor GET /api/supplier returns 403 Forbidden');

        const docOrderRes = await httpRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/order',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${doctorRes.body.token}` }
        });
        assert(docOrderRes.statusCode === 403, 'Doctor GET /api/order returns 403 Forbidden');

        // Test 7.2: Pharmacist Authorization Restrictions
        console.log('\nTest 7.2: Pharmacist API Role Authorization Restrictions');
        const pharmaUserRes = await httpRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/user',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${pharmaRes.body.token}` }
        });
        assert(pharmaUserRes.statusCode === 403, 'Pharmacist GET /api/user returns 403 Forbidden');

        const pharmaAuditRes = await httpRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/audit',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${pharmaRes.body.token}` }
        });
        assert(pharmaAuditRes.statusCode === 403, 'Pharmacist GET /api/audit returns 403 Forbidden');

        const pharmaSupplierRes = await httpRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/supplier',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${pharmaRes.body.token}` }
        });
        assert(pharmaSupplierRes.statusCode === 200, 'Pharmacist GET /api/supplier returns 200 OK');

        // Test 7.3: Doctor Specific Dashboard Stats
        console.log('\nTest 7.3: Doctor Tailored Dashboard Stats');
        const docStatsRes = await httpRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/dashboard/stats',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${doctorRes.body.token}` }
        });
        assert(docStatsRes.statusCode === 200, 'Doctor GET /api/dashboard/stats returns 200 OK');
        assert(typeof docStatsRes.body.data.myPrescriptions === 'number', 'Doctor stats includes myPrescriptions');
        assert(docStatsRes.body.data.todaySales === undefined, 'Doctor stats hides sales revenue');

        // Test 7.4: Patient Management API & References
        console.log('\nTest 7.4: Patient Management API');
        const patientListRes = await httpRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/patient',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${doctorRes.body.token}` }
        });
        assert(patientListRes.statusCode === 200, 'Doctor GET /api/patient returns 200 OK');
        assert(Array.isArray(patientListRes.body.data), 'Patient list array received');

        // Test 7.5: Password Policy Enforcement on User Creation
        console.log('\nTest 7.5: Server-side Password Strength Validation');
        const weakUserRes = await httpRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/user',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminRes.body.token}` }
        }, {
            name: 'Weak Pass User',
            email: `weak.${Date.now()}@pharmacy.com`,
            nic: '990001112V',
            number: '+91 9999999999',
            role: 'pharmacist',
            password: 'simple'
        });
        assert(weakUserRes.statusCode === 400, 'Weak password creation rejected with 400 Bad Request');
        assert(weakUserRes.body.message.includes('Password must be at least 8 characters'), 'Returns password policy error message');

        // Test 7.6: Case-Insensitive Email Login
        console.log('\nTest 7.6: Case-Insensitive Email Login Verification');
        const uppercaseLogin = await httpRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'ADMIN@PHARMACY.COM', password: 'Admin@123' });
        assert(uppercaseLogin.statusCode === 200 && uppercaseLogin.body.success, 'Case-insensitive email login (ADMIN@PHARMACY.COM) returns 200 OK');

        // Test 8: Logout & Server-Side Token Revocation
        console.log('\nTest 8: Logout API & Server-Side Token Revocation');
        const logoutRes = await httpRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/logout',
            method: 'POST',
            headers: { 'Authorization': `Bearer ${adminRes.body.token}` }
        });
        assert(logoutRes.statusCode === 200, 'Logout returns 200 OK');
        assert(logoutRes.body.success === true, 'Logout returns success: true');

        // Verify token is revoked server-side
        const revokedTokenRes = await httpRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/user',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${adminRes.body.token}` }
        });
        assert(revokedTokenRes.statusCode === 401, 'Revoked token after logout returns 401 Session Invalidated');

        // Test 9: Web Dashboard Routes
        console.log('\nTest 9: Web Dashboard Server Routes');
        const rootRes = await httpRequest({ hostname: 'localhost', port: 3000, path: '/', method: 'GET' });
        assert(rootRes.statusCode === 200 && rootRes.body.includes('Pharmacy ERP'), 'GET / serves login.html page');

        const adminRouteRes = await httpRequest({ hostname: 'localhost', port: 3000, path: '/admin/dashboard', method: 'GET' });
        assert(adminRouteRes.statusCode === 200 && adminRouteRes.body.includes('index_manage'), 'GET /admin/dashboard serves index_manage.html page');

        const doctorRouteRes = await httpRequest({ hostname: 'localhost', port: 3000, path: '/doctor/dashboard', method: 'GET' });
        assert(doctorRouteRes.statusCode === 200 && doctorRouteRes.body.includes('dashboard.html'), 'GET /doctor/dashboard serves dashboard.html page');

        const pharmaRouteRes = await httpRequest({ hostname: 'localhost', port: 3000, path: '/pharmacist/dashboard', method: 'GET' });
        assert(pharmaRouteRes.statusCode === 200 && pharmaRouteRes.body.includes('dashboard.html'), 'GET /pharmacist/dashboard serves dashboard.html page');

        await mongoose.connection.close();

        console.log('\n====================================================');
        console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
        console.log('====================================================');

        if (failed > 0) process.exit(1);
    } catch (err) {
        console.error('Test execution failed:', err);
        if (mongoose.connection) await mongoose.connection.close();
        process.exit(1);
    }
}

runAuthTests();
