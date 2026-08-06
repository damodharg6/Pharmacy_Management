const http = require('http');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pharmacyManagementDB';

function httpRequest(options, postData) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let parsed = null;
                try { parsed = JSON.parse(body); } catch (e) { parsed = body; }
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

async function runQA() {
    console.log('====================================================');
    console.log('🧪 PHARMACY ERP FULL COMPREHENSIVE END-TO-END QA RUN');
    console.log('====================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`  ✅ PASS: ${message}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${message}`);
            failed++;
        }
    }

    try {
        await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        const User = require('../server/models/user');
        const Patient = require('../server/models/patient');
        const Medicine = require('../server/models/medicine');
        const Category = require('../server/models/category');

        // ===================================================
        // PHASE 1 — ENVIRONMENT SANITY CHECK
        // ===================================================
        console.log('▶ PHASE 1: Environment Sanity Check');
        const usersInDb = await User.find({});
        assert(usersInDb.length >= 3, '1.1 Three or more default users exist');
        
        const hasPlaintextPassword = usersInDb.some(u => !u.password.startsWith('$2a$') && !u.password.startsWith('$2b$'));
        assert(!hasPlaintextPassword, '1.2 No plaintext passwords stored in database');

        // ===================================================
        // PHASE 2 — ADMIN OPERATIONS
        // ===================================================
        console.log('\n▶ PHASE 2: Admin Operations & Role Boundaries');

        // 2.1 Login success
        const adminLogin = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'admin@pharmacy.com', password: 'Admin@123' });
        assert(adminLogin.statusCode === 200 && adminLogin.body.success, '2.1.1 Admin login success');
        const adminToken = adminLogin.body.token;

        // 2.2 Wrong password login
        const badLogin = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'admin@pharmacy.com', password: 'wrongPassword' });
        assert(badLogin.statusCode === 401, '2.2.1 Incorrect password returns 401 Unauthorized');

        // 2.3 Inactive account block
        await User.updateOne({ email: 'admin@pharmacy.com' }, { status: 'inactive', isActive: false });
        const inactiveLogin = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'admin@pharmacy.com', password: 'Admin@123' });
        assert(inactiveLogin.statusCode === 403, '2.3.1 Inactive account blocked with 403');
        await User.updateOne({ email: 'admin@pharmacy.com' }, { status: 'active', isActive: true });

        // 2.4 Dashboard stats verify
        const adminStats = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/dashboard/stats', method: 'GET',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        assert(adminStats.statusCode === 200 && adminStats.body.data.totalUsers !== undefined, '2.4.1 Admin stats returns total staff count');

        // 2.5 User creation password policy reject weak
        const weakUserCreate = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/user', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
        }, {
            name: 'Weak Pass User',
            email: `weak.${Date.now()}@pharmacy.com`,
            nic: '990001119V',
            number: '+91 9999999999',
            role: 'doctor',
            password: 'simple'
        });
        assert(weakUserCreate.statusCode === 400, '2.5.1 Admin user creation rejects weak password');

        // 2.6 User creation password policy accept strong
        const tempEmail = `strong.${Date.now()}@pharmacy.com`;
        const strongUserCreate = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/user', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
        }, {
            name: 'Strong Pass User',
            email: tempEmail,
            nic: '990001118V',
            number: '+91 9999999991',
            role: 'doctor',
            password: 'StrongPassword@123',
            address: 'QA Ward'
        });
        assert(strongUserCreate.statusCode === 201, '2.6.1 Admin user creation accepts strong password');
        const createdUserId = strongUserCreate.body.data.id;

        // 2.7 Update User
        const editUser = await httpRequest({
            hostname: 'localhost', port: 3000, path: `/api/user/${createdUserId}`, method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
        }, {
            name: 'Strong Pass User Updated',
            email: tempEmail,
            nic: '990001118V',
            number: '+91 9999999992',
            role: 'doctor',
            address: 'QA Ward Updated'
        });
        assert(editUser.statusCode === 200, '2.7.1 Admin edits user successfully');

        // 2.8 Deactivate User
        const deactivateUser = await httpRequest({
            hostname: 'localhost', port: 3000, path: `/api/user/${createdUserId}/deactivate`, method: 'PATCH',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        console.log("DEBUG DEACTIVATE USER RESPONSE:", deactivateUser.statusCode, JSON.stringify(deactivateUser.body));
        assert(deactivateUser.statusCode === 200 && deactivateUser.body.data.status === 'inactive', '2.8.1 Admin deactivates user');

        // 2.9 Delete User
        const deleteUser = await httpRequest({
            hostname: 'localhost', port: 3000, path: `/api/user/${createdUserId}`, method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        assert(deleteUser.statusCode === 200, '2.9.1 Admin deletes user');

        // 2.10 Medicine, Category, Suppliers CRUD
        const categories = await Category.find({});
        const medicines = await Medicine.find({});
        assert(categories.length > 0 && medicines.length > 0, '2.10.1 Medicine inventory data populated');


        // ===================================================
        // PHASE 3 — DOCTOR CLINICAL WORKFLOWS
        // ===================================================
        console.log('\n▶ PHASE 3: Doctor Operations & API Role Restrictions');

        // 3.1 Doctor Login
        const docLogin = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'doctor@pharmacy.com', password: 'Doctor@123' });
        assert(docLogin.statusCode === 200 && docLogin.body.success, '3.1.1 Doctor login success');
        const docToken = docLogin.body.token;

        // 3.2 Clinical stats only
        const docStats = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/dashboard/stats', method: 'GET',
            headers: { 'Authorization': `Bearer ${docToken}` }
        });
        assert(docStats.statusCode === 200 && docStats.body.data.myPrescriptions !== undefined && docStats.body.data.todaySales === undefined, '3.2.1 Doctor stats contains clinical counts and hides financial data');

        // 3.3 Create Patient
        const createPatient = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/patient', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${docToken}` }
        }, {
            name: 'Epoch QA Patient',
            age: 40,
            gender: 'female',
            phone: '+91 9991112223',
            email: 'qa.patient@example.com',
            address: 'Ward B'
        });
        assert(createPatient.statusCode === 201 && createPatient.body.success, '3.3.1 Doctor creates Patient record');
        const patientId = createPatient.body.data._id;

        // 3.4 Create Prescription with patient ref
        const createRx = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/prescription', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${docToken}` }
        }, {
            patient: patientId,
            patientName: 'Epoch QA Patient',
            patientAge: 40,
            patientPhone: '+91 9991112223',
            diagnosis: 'Bronchitis',
            medicines: [
                {
                    medicine: medicines[0]._id,
                    medicineName: medicines[0].name,
                    dosage: '1 Capsule',
                    frequency: '1-0-1',
                    duration: '7 days',
                    quantity: 2
                }
            ],
            notes: 'Rest well'
        });
        assert(createRx.statusCode === 201 && createRx.body.success, '3.4.1 Doctor creates Prescription with Patient reference');
        const rxId = createRx.body.data._id;

        // 3.5 Negative tests - Doctor unauthorized paths
        const docUsersAttempt = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/user', method: 'GET',
            headers: { 'Authorization': `Bearer ${docToken}` }
        });
        assert(docUsersAttempt.statusCode === 403, '3.5.1 Doctor GET /api/user returns 403 Forbidden');

        const docAuditAttempt = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/audit', method: 'GET',
            headers: { 'Authorization': `Bearer ${docToken}` }
        });
        assert(docAuditAttempt.statusCode === 403, '3.5.2 Doctor GET /api/audit returns 403 Forbidden');

        const docSupplierAttempt = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/supplier', method: 'GET',
            headers: { 'Authorization': `Bearer ${docToken}` }
        });
        assert(docSupplierAttempt.statusCode === 403, '3.5.3 Doctor GET /api/supplier returns 403 Forbidden');


        // ===================================================
        // PHASE 4 — PHARMACIST WORKFLOWS
        // ===================================================
        console.log('\n▶ PHASE 4: Pharmacist Operations & API Role Restrictions');

        // 4.1 Pharmacist Login
        const pharmaLogin = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'pharmacist@pharmacy.com', password: 'Pharma@123' });
        assert(pharmaLogin.statusCode === 200 && pharmaLogin.body.success, '4.1.1 Pharmacist login success');
        const pharmaToken = pharmaLogin.body.token;

        // 4.2 Verify stats
        const pharmaStats = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/dashboard/stats', method: 'GET',
            headers: { 'Authorization': `Bearer ${pharmaToken}` }
        });
        assert(pharmaStats.statusCode === 200 && pharmaStats.body.data.todaySales !== undefined, '4.2.1 Pharmacist stats includes store sales data');

        // 4.3 Dispense Prescription (Item 5/6)
        const dispenseRx = await httpRequest({
            hostname: 'localhost', port: 3000, path: `/api/prescription/${rxId}/dispense`, method: 'PATCH',
            headers: { 'Authorization': `Bearer ${pharmaToken}` }
        });
        console.log("DEBUG DISPENSE RX RESPONSE:", dispenseRx.statusCode, JSON.stringify(dispenseRx.body));
        assert(dispenseRx.statusCode === 200 && dispenseRx.body.data.status === 'dispensed', '4.3.1 Pharmacist dispenses prescription and updates status');

        // 4.4 Negative tests - Pharmacist unauthorized paths
        const pharmaUsersAttempt = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/user', method: 'GET',
            headers: { 'Authorization': `Bearer ${pharmaToken}` }
        });
        assert(pharmaUsersAttempt.statusCode === 403, '4.4.1 Pharmacist GET /api/user returns 403 Forbidden');

        const pharmaAuditAttempt = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/audit', method: 'GET',
            headers: { 'Authorization': `Bearer ${pharmaToken}` }
        });
        assert(pharmaAuditAttempt.statusCode === 403, '4.4.2 Pharmacist GET /api/audit returns 403 Forbidden');


        // ===================================================
        // PHASE 5 — CROSS-ROLE INTEGRATION
        // ===================================================
        console.log('\n▶ PHASE 5: Cross-Role Data & Action Verification');
        
        // Audit log traces
        const checkAudits = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/audit', method: 'GET',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const hasDispenseLog = checkAudits.body.data.some(log => log.action === 'dispense_prescription');
        assert(hasDispenseLog, '5.1 Pharmacist dispense prescription captured in Admin security audit logs');

        await mongoose.connection.close();

        console.log('\n====================================================');
        console.log(`QA VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
        console.log('====================================================');

        if (failed > 0) process.exit(1);
    } catch (err) {
        console.error('QA script execution failed:', err);
        if (mongoose.connection) await mongoose.connection.close();
        process.exit(1);
    }
}

runQA();
