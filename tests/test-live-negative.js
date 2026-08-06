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
    // 1. Log in Doctor
    const docLogin = await httpRequest({
        hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { email: 'doctor@pharmacy.com', password: 'Doctor@123' });
    const docToken = docLogin.body.token;

    // 2. Log in Pharmacist
    const pharmaLogin = await httpRequest({
        hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { email: 'pharmacist@pharmacy.com', password: 'Pharma@123' });
    const pharmaToken = pharmaLogin.body.token;

    console.log('\n--- Doctor Calling GET /api/user ---');
    const res1 = await httpRequest({
        hostname: 'localhost', port: 3000, path: '/api/user', method: 'GET',
        headers: { 'Authorization': `Bearer ${docToken}` }
    });
    console.log(`STATUS: ${res1.statusCode}`);
    console.log('BODY:', JSON.stringify(res1.body, null, 2));

    console.log('\n--- Doctor Calling GET /api/audit ---');
    const res2 = await httpRequest({
        hostname: 'localhost', port: 3000, path: '/api/audit', method: 'GET',
        headers: { 'Authorization': `Bearer ${docToken}` }
    });
    console.log(`STATUS: ${res2.statusCode}`);
    console.log('BODY:', JSON.stringify(res2.body, null, 2));

    console.log('\n--- Pharmacist Calling GET /api/user ---');
    const res3 = await httpRequest({
        hostname: 'localhost', port: 3000, path: '/api/user', method: 'GET',
        headers: { 'Authorization': `Bearer ${pharmaToken}` }
    });
    console.log(`STATUS: ${res3.statusCode}`);
    console.log('BODY:', JSON.stringify(res3.body, null, 2));

    console.log('\n--- Pharmacist Calling GET /api/audit ---');
    const res4 = await httpRequest({
        hostname: 'localhost', port: 3000, path: '/api/audit', method: 'GET',
        headers: { 'Authorization': `Bearer ${pharmaToken}` }
    });
    console.log(`STATUS: ${res4.statusCode}`);
    console.log('BODY:', JSON.stringify(res4.body, null, 2));

    console.log('\n--- Unauthenticated Calling GET /api/user ---');
    const res5 = await httpRequest({
        hostname: 'localhost', port: 3000, path: '/api/user', method: 'GET'
    });
    console.log(`STATUS: ${res5.statusCode}`);
    console.log('BODY:', JSON.stringify(res5.body, null, 2));

    console.log('\n--- NoSQL Injection Login Attempt 1 ($ne) ---');
    const res6 = await httpRequest({
        hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { email: { $ne: null }, password: { $ne: null } });
    console.log(`STATUS: ${res6.statusCode}`);
    console.log('BODY:', JSON.stringify(res6.body, null, 2));

    console.log('\n--- NoSQL Injection Login Attempt 2 ($gt) ---');
    const res7 = await httpRequest({
        hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { email: { $gt: "" }, password: { $gt: "" } });
    console.log(`STATUS: ${res7.statusCode}`);
    console.log('BODY:', JSON.stringify(res7.body, null, 2));
}

run().catch(console.error);
