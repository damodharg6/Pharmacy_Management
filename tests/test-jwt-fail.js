const { spawn } = require('child_process');
const path = require('path');

console.log('--- Testing Server Startup without JWT_SECRET ---');
const env = Object.assign({}, process.env);
delete env.JWT_SECRET; // Ensure it's not set

const serverPath = path.join(__dirname, '../server.js');
const server = spawn('node', [serverPath], { env });

let stdout = '';
let stderr = '';

server.stdout.on('data', (data) => {
    stdout += data.toString();
});

server.stderr.on('data', (data) => {
    stderr += data.toString();
});

server.on('close', (code) => {
    console.log(`Server exited with code: ${code}`);
    console.log(`STDERR OUTPUT:\n${stderr}`);
    
    if (code !== 0 && stderr.includes('CRITICAL ERROR: JWT_SECRET environment variable is not defined.')) {
        console.log('✅ TEST PASSED: Server correctly failed to start when JWT_SECRET is unset.');
    } else {
        console.error('❌ TEST FAILED: Server did not exit correctly or did not output the expected error.');
        console.error(`STDOUT OUTPUT:\n${stdout}`);
        process.exit(1);
    }
});
