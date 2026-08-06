const http = require('http');

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

async function run() {
    // 1. Login Admin, Doctor, Pharmacist
    const adminLogin = await httpRequest({
        hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { email: 'admin@pharmacy.com', password: 'Admin@123' });
    const adminToken = adminLogin.body.token;

    const docLogin = await httpRequest({
        hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { email: 'doctor@pharmacy.com', password: 'Doctor@123' });
    const docToken = docLogin.body.token;

    const pharmaLogin = await httpRequest({
        hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { email: 'pharmacist@pharmacy.com', password: 'Pharma@123' });
    const pharmaToken = pharmaLogin.body.token;

    // 2. Fetch seeded medicines to get a target medicine
    const medList = await httpRequest({
        hostname: 'localhost', port: 3000, path: '/api/medicine', method: 'GET',
        headers: { 'Authorization': `Bearer ${docToken}` }
    });
    const targetMed = medList.body.data[0];
    console.log(`\nTarget Medicine: ${targetMed.name}`);
    console.log(`Stock level BEFORE prescription dispensing: ${targetMed.quantity}`);

    // 3. Doctor registers patient & issues prescription
    const createPatient = await httpRequest({
        hostname: 'localhost', port: 3000, path: '/api/patient', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${docToken}` }
    }, {
        name: 'John E2E Patient',
        age: 38,
        phone: '+91 9993334440'
    });
    const patientId = createPatient.body.data._id;

    console.log('\n--- Doctor Issuing Prescription ---');
    const rxRes = await httpRequest({
        hostname: 'localhost', port: 3000, path: '/api/prescription', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${docToken}` }
    }, {
        patient: patientId,
        patientName: 'John E2E Patient',
        patientAge: 38,
        diagnosis: 'Mild Fever',
        medicines: [
            {
                medicine: targetMed._id,
                medicineName: targetMed.name,
                dosage: '1 Tablet',
                frequency: '1-0-1',
                duration: '3 days',
                quantity: 6
            }
        ]
    });
    console.log('API RESPONSE:', JSON.stringify(rxRes.body, null, 2));
    const rxId = rxRes.body.data._id;

    // 4. Pharmacist dispenses the prescription
    console.log('\n--- Pharmacist Dispensing Prescription ---');
    const dispenseRes = await httpRequest({
        hostname: 'localhost', port: 3000, path: `/api/prescription/${rxId}/dispense`, method: 'PATCH',
        headers: { 'Authorization': `Bearer ${pharmaToken}` }
    });
    console.log('API RESPONSE:', JSON.stringify(dispenseRes.body, null, 2));

    // 5. Check stock level after dispensing
    const medDetail = await httpRequest({
        hostname: 'localhost', port: 3000, path: `/api/medicine/${targetMed._id}`, method: 'GET',
        headers: { 'Authorization': `Bearer ${docToken}` }
    });
    console.log(`\nStock level AFTER prescription dispensing: ${medDetail.body.data.quantity}`);

    // 6. View Admin Audit Logs
    console.log('\n--- Recent Admin Security Audit Logs ---');
    const auditRes = await httpRequest({
        hostname: 'localhost', port: 3000, path: '/api/audit', method: 'GET',
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const relevantLogs = auditRes.body.data.filter(log => 
        log.action === 'create_prescription' || log.action === 'dispense_prescription'
    ).slice(0, 2);
    console.log('AUDIT LOG ENTRIES:', JSON.stringify(relevantLogs, null, 2));
}

run().catch(console.error);
