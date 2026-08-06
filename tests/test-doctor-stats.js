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

    // 2. Fetch Stats
    console.log('\n--- Doctor Fetching Dashboard Stats ---');
    const res = await httpRequest({
        hostname: 'localhost', port: 3000, path: '/api/dashboard/stats', method: 'GET',
        headers: { 'Authorization': `Bearer ${docToken}` }
    });
    console.log(`STATUS: ${res.statusCode}`);
    console.log('RESPONSE BODY:', JSON.stringify(res.body, null, 2));
}

run().catch(console.error);
