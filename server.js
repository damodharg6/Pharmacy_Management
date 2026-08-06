const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const routes = require('./server/routes/web');
const apiRoutes = require('./server/routes/api');
const connection = require('./server/config/db');

const app = express();

if (!process.env.JWT_SECRET) {
    console.error('❌ CRITICAL ERROR: JWT_SECRET environment variable is not defined.');
    console.error('   Server shutdown initiated (fail closed).');
    process.exit(1);
}

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
app.use(cors({ origin: allowedOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], allowedHeaders: ['Content-Type', 'Authorization'] }));

// Body parsing
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: false, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'app'), { index: false }));
app.use('/node_modules', express.static('node_modules'));

// API routes
app.use('/api', apiRoutes);

// Web routes
app.use('/', routes);

const port = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(port, () => {
        console.log(`✅ Pharmacy Management Server running at: http://localhost:${port}`);
        console.log(`   Admin login: admin@pharmacy.com / Admin@123`);
    });
}

module.exports = app;
