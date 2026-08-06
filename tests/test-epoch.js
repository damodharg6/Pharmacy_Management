const http = require('http');
const mongoose = require('mongoose');

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

async function runEpochSimulation() {
    console.log('====================================================');
    console.log('🔄 PHARMACY ERP MULTI-ROLE OPERATIONAL EPOCH CYCLE');
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
        await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

        // ----------------------------------------------------
        // EPOCH PHASE 1: ADMIN OPERATIONS
        // ----------------------------------------------------
        console.log('▶ PHASE 1: Admin Full ERP Administration Cycle');

        // 1. Admin Login
        const adminLogin = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'admin@pharmacy.com', password: 'Admin@123' });
        assert(adminLogin.statusCode === 200 && adminLogin.body.success, '1.1 Admin logged in');
        const adminToken = adminLogin.body.token;

        // 2. Admin Create Staff User
        const createUser = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/user', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
        }, {
            name: 'Dr. Epoch Specialist',
            email: `epoch.doc.${Date.now()}@pharmacy.com`,
            nic: `99${Math.floor(1000000 + Math.random() * 9000000)}V`,
            number: '+91 9998887770',
            role: 'doctor',
            password: 'Doctor@123',
            address: 'Specialist Wing'
        });
        assert(createUser.statusCode === 201 && createUser.body.success, '1.2 Admin created new Doctor user');

        // 3. Admin Create Category
        const createCat = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/category', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
        }, { name: `Pediatrics-${Date.now()}`, description: 'Pediatric care medications' });
        assert(createCat.statusCode === 201 && createCat.body.success, '1.3 Admin created new Category');
        const categoryId = createCat.body.data._id;

        // 4. Admin Create Medicine
        const createMed = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/medicine', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
        }, {
            name: `Amoxicillin Syrup 250mg-${Date.now()}`,
            genericName: 'Amoxicillin Liquid',
            category: categoryId,
            manufacturer: 'Epoch Bio Labs',
            unit: 'bottle',
            price: 60.00,
            costPrice: 35.00,
            quantity: 100,
            reorderLevel: 20,
            batchNumber: `BATCH-EPOCH-${Date.now()}`
        });
        assert(createMed.statusCode === 201 && createMed.body.success, '1.4 Admin created new Medicine');
        const createdMed = createMed.body.data;

        // 5. Admin Create Supplier
        const createSupplier = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/supplier', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
        }, {
            name: `Global Epoch Pharma Ltd-${Date.now()}`,
            contactPerson: 'Sarah Jenkins',
            email: 'sales@epochpharma.com',
            phone: '+91 1144556677',
            city: 'Bangalore',
            address: 'Epoch Tech Park'
        });
        assert(createSupplier.statusCode === 201 && createSupplier.body.success, '1.5 Admin created new Supplier');

        // 6. Admin View Audit Logs
        const auditLogs = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/audit', method: 'GET',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        assert(auditLogs.statusCode === 200 && auditLogs.body.data.length > 0, '1.6 Admin accessed Audit Logs');


        // ----------------------------------------------------
        // EPOCH PHASE 2: DOCTOR OPERATIONS
        // ----------------------------------------------------
        console.log('\n▶ PHASE 2: Doctor Clinical Workflow Cycle');

        // 1. Doctor Login
        const docLogin = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'doctor@pharmacy.com', password: 'Doctor@123' });
        assert(docLogin.statusCode === 200 && docLogin.body.success, '2.1 Doctor logged in');
        const docToken = docLogin.body.token;

        // 2. Doctor Dashboard Stats
        const docStats = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/dashboard/stats', method: 'GET',
            headers: { 'Authorization': `Bearer ${docToken}` }
        });
        assert(docStats.statusCode === 200 && typeof docStats.body.data.myPrescriptions === 'number', '2.2 Doctor fetched tailored clinical stats');

        // 3. Doctor Search Medicine
        const searchMed = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/medicine?search=Paracetamol', method: 'GET',
            headers: { 'Authorization': `Bearer ${docToken}` }
        });
        assert(searchMed.statusCode === 200 && searchMed.body.data.length > 0, '2.3 Doctor searched medicine lookup');
        const medToPrescribe = searchMed.body.data[0];

        // 4. Doctor Create Prescription
        const createRx = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/prescription', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${docToken}` }
        }, {
            patientName: 'Epoch Test Patient',
            patientAge: 28,
            patientPhone: '+91 9123456789',
            diagnosis: 'Acute Throat Infection',
            medicines: [
                {
                    medicine: medToPrescribe._id,
                    medicineName: medToPrescribe.name,
                    dosage: '1 Tablet',
                    frequency: '1-0-1',
                    duration: '5 days',
                    quantity: 10
                }
            ],
            notes: 'Take after meals'
        });
        assert(createRx.statusCode === 201 && createRx.body.success, '2.4 Doctor created new Prescription');
        const createdRx = createRx.body.data;

        // 5. Doctor Security Restrictions Check
        const docUserAttempt = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/user', method: 'GET',
            headers: { 'Authorization': `Bearer ${docToken}` }
        });
        assert(docUserAttempt.statusCode === 403, '2.5 Doctor blocked from accessing User Management API');


        // ----------------------------------------------------
        // EPOCH PHASE 3: PHARMACIST OPERATIONS
        // ----------------------------------------------------
        console.log('\n▶ PHASE 3: Pharmacist Dispensing & Inventory Cycle');

        // 1. Pharmacist Login
        const pharmaLogin = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'pharmacist@pharmacy.com', password: 'Pharma@123' });
        assert(pharmaLogin.statusCode === 200 && pharmaLogin.body.success, '3.1 Pharmacist logged in');
        const pharmaToken = pharmaLogin.body.token;

        // 2. Pharmacist View Prescriptions
        const rxList = await httpRequest({
            hostname: 'localhost', port: 3000, path: `/api/prescription/${createdRx._id}`, method: 'GET',
            headers: { 'Authorization': `Bearer ${pharmaToken}` }
        });
        assert(rxList.statusCode === 200 && rxList.body.data.patientName === 'Epoch Test Patient', '3.2 Pharmacist fetched Doctor prescription');

        // 3. Pharmacist Dispense Prescription
        const dispenseRx = await httpRequest({
            hostname: 'localhost', port: 3000, path: `/api/prescription/${createdRx._id}/dispense`, method: 'PATCH',
            headers: { 'Authorization': `Bearer ${pharmaToken}` }
        });
        assert(dispenseRx.statusCode === 200 && dispenseRx.body.data.status === 'dispensed', '3.3 Pharmacist dispensed prescription and updated inventory');

        // 4. Pharmacist Create Sales Order
        const createOrder = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/order', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pharmaToken}` }
        }, {
            customer: { name: 'Epoch Test Patient', phone: '+91 9123456789', email: 'epoch.patient@example.com' },
            items: [
                {
                    medicine: medToPrescribe._id,
                    medicineName: medToPrescribe.name,
                    quantity: 2,
                    unitPrice: medToPrescribe.price,
                    total: medToPrescribe.price * 2
                }
            ],
            subtotal: medToPrescribe.price * 2,
            discount: 0,
            tax: 0,
            total: medToPrescribe.price * 2,
            status: 'delivered'
        });
        assert(createOrder.statusCode === 201 && createOrder.body.success, '3.4 Pharmacist created & completed Sales Order');

        // 5. Pharmacist Security Restrictions Check
        const pharmaAuditAttempt = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/audit', method: 'GET',
            headers: { 'Authorization': `Bearer ${pharmaToken}` }
        });
        assert(pharmaAuditAttempt.statusCode === 403, '3.5 Pharmacist blocked from accessing Audit Logs API');

        await mongoose.connection.close();

        console.log('\n====================================================');
        console.log(`EPOCH CYCLE RESULTS: ${passed} PASSED, ${failed} FAILED`);
        console.log('====================================================');

        if (failed > 0) process.exit(1);
    } catch (err) {
        console.error('Epoch simulation error:', err);
        if (mongoose.connection) await mongoose.connection.close();
        process.exit(1);
    }
}

runEpochSimulation();
