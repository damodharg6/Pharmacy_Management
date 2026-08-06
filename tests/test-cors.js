const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

console.log('--- Testing Strict CORS Config without ALLOWED_ORIGINS ---');
const env = Object.assign({}, process.env);
env.JWT_SECRET = 'test-secret';
delete env.ALLOWED_ORIGINS; // Ensure it's not set
// Use a different port so it doesn't conflict with the already running server
env.PORT = 3001; 

const serverPath = path.join(__dirname, '../server.js');
const serverProcess = spawn('node', [serverPath], { env });

let serverReady = false;
serverProcess.stdout.on('data', (data) => {
    if (data.toString().includes('Server running at:')) {
        serverReady = true;
        runTest();
    }
});

function httpRequest(options) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            resolve({ statusCode: res.statusCode, headers: res.headers });
        });
        req.on('error', reject);
        req.end();
    });
}

async function runTest() {
    try {
        const res = await httpRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/user',
            method: 'OPTIONS', // Preflight request
            headers: {
                'Origin': 'http://evil-origin.com',
                'Access-Control-Request-Method': 'GET'
            }
        });
        
        console.log(`STATUS CODE: ${res.statusCode}`);
        console.log(`Access-Control-Allow-Origin header: ${res.headers['access-control-allow-origin'] || 'NOT SET'}`);
        
        if (!res.headers['access-control-allow-origin'] || res.headers['access-control-allow-origin'] !== '*') {
            console.log('✅ TEST PASSED: Server did not return a wildcard (*) CORS origin header when ALLOWED_ORIGINS is unset.');
        } else {
            console.error('❌ TEST FAILED: Server returned wildcard (*) CORS header!');
            process.exitCode = 1;
        }
    } catch (e) {
        console.error('Request error:', e);
        process.exitCode = 1;
    } finally {
        serverProcess.kill();
    }
}
