const http = require('http');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pharmacy_jwt_secret_2024';

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
    // 1. Mock Expired JWT
    console.log('\n--- 1. Mocking Expired JWT Verification ---');
    const expiredToken = jwt.sign(
        { id: '60c72b2f9b1d8b2d88888888', email: 'expired@pharmacy.com', role: 'admin', name: 'Expired User' },
        JWT_SECRET,
        { expiresIn: '0s' } // Expired instantly
    );

    const expiryRes = await httpRequest({
        hostname: 'localhost', port: 3000, path: '/api/user', method: 'GET',
        headers: { 'Authorization': `Bearer ${expiredToken}` }
    });
    console.log(`STATUS CODE: ${expiryRes.statusCode}`);
    console.log('RESPONSE:', JSON.stringify(expiryRes.body, null, 2));

    // 2. Brute-Force Rate Limiting (6 failed logins)
    console.log('\n--- 2. Performing 6 Failed Logins (Lockout Verification) ---');
    for (let i = 1; i <= 6; i++) {
        const loginAttempt = await httpRequest({
            hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: `lockout.test@pharmacy.com`, password: 'WrongPassword123' });

        console.log(`Attempt ${i}: Status = ${loginAttempt.statusCode}, Message = ${loginAttempt.body.message}`);
    }
}

run().catch(console.error);
