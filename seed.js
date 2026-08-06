const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('./server/models/user');
const Category = require('./server/models/category');
const Medicine = require('./server/models/medicine');
const Supplier = require('./server/models/supplierDetails');
const Order = require('./server/models/order');
const Patient = require('./server/models/patient');
const Prescription = require('./server/models/prescription');
const Inventory = require('./server/models/inventory');
const Notification = require('./server/models/notification');
const AuditLog = require('./server/models/auditLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pharmacyManagementDB';

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to database.');

        // Clear existing database
        console.log('Clearing existing database...');
        await mongoose.connection.db.dropDatabase();

        console.log('Seeding Users...');

        const seedUserData = [
            {
                name: 'System Admin',
                email: 'admin@pharmacy.com',
                nic: '901234567V',
                number: '+91 9876543210',
                phone: '+91 9876543210',
                role: 'admin',
                password: await bcrypt.hash('Admin@123', 10),
                status: 'active',
                isActive: true,
                address: 'Main Office, Delhi'
            },
            {
                name: 'Alice Pharmacist',
                email: 'pharmacist@pharmacy.com',
                nic: '921234567V',
                number: '+91 9876543211',
                phone: '+91 9876543211',
                role: 'pharmacist',
                password: await bcrypt.hash('Pharma@123', 10),
                status: 'active',
                isActive: true,
                address: 'Pharmacy Store 1'
            },
            {
                name: 'Dr. Robert Smith',
                email: 'doctor@pharmacy.com',
                nic: '881234567V',
                number: '+91 9876543212',
                phone: '+91 9876543212',
                role: 'doctor',
                password: await bcrypt.hash('Doctor@123', 10),
                status: 'active',
                isActive: true,
                address: 'City General Hospital'
            },
            {
                name: 'Dr. Sarah Connor',
                email: 'sarah.doctor@pharmacy.com',
                nic: '851234567V',
                number: '+91 9876543213',
                phone: '+91 9876543213',
                role: 'doctor',
                password: await bcrypt.hash('Doctor@123', 10),
                status: 'active',
                isActive: true,
                address: 'St. Jude Hospital'
            }
        ];

        const users = await User.create(seedUserData);

        const adminUser = users[0];
        const doctorUser = users[2];

        console.log('Seeding Categories...');
        const categories = await Category.create([
            { name: 'Antibiotics', description: 'Antimicrobial drugs' },
            { name: 'Painkillers', description: 'Analgesic and anti-inflammatory' },
            { name: 'Antipyretics', description: 'Fever reducing medications' },
            { name: 'Cardiovascular', description: 'Heart and blood pressure' },
            { name: 'Vitamins & Supplements', description: 'Nutritional supplements' },
            { name: 'Respiratory', description: 'Asthma and allergy drugs' }
        ]);

        console.log('Seeding Suppliers...');
        const suppliers = await Supplier.create([
            { name: 'Sun Pharmaceutical Ltd', contactPerson: 'Rajesh Kumar', email: 'sales@sunpharma.com', phone: '+91 1123456789', city: 'Mumbai', address: 'Sun House, Goregaon' },
            { name: 'Cipla Healthcare', contactPerson: 'Anish Sharma', email: 'orders@cipla.com', phone: '+91 2234567890', city: 'Mumbai', address: 'Cipla House, Lower Parel' },
            { name: 'Dr. Reddy Laboratories', contactPerson: 'Venkatesh Rao', email: 'supply@drreddys.com', phone: '+91 4023456781', city: 'Hyderabad', address: 'Banjara Hills' },
            { name: 'Lupin Pharmaceuticals', contactPerson: 'Meera Patel', email: 'info@lupin.com', phone: '+91 2266402222', city: 'Pune', address: 'Kalpataru Inspire' }
        ]);

        console.log('Seeding Medicines...');
        const medicines = await Medicine.create([
            {
                name: 'Paracetamol 500mg',
                genericName: 'Acetaminophen',
                category: categories[2]._id,
                manufacturer: 'Cipla Healthcare',
                unit: 'tablet',
                price: 15.50,
                costPrice: 8.00,
                quantity: 250,
                reorderLevel: 50,
                batchNumber: 'BATCH-2024-P500',
                expiryDate: new Date('2026-12-31'),
                barcode: '8901234567890',
                createdBy: adminUser._id
            },
            {
                name: 'Amoxicillin 500mg',
                genericName: 'Amoxicillin Trihydrate',
                category: categories[0]._id,
                manufacturer: 'Sun Pharmaceutical Ltd',
                unit: 'capsule',
                price: 45.00,
                costPrice: 25.00,
                quantity: 8, // Low stock on purpose
                reorderLevel: 20,
                batchNumber: 'BATCH-2024-AM500',
                expiryDate: new Date('2025-10-15'),
                barcode: '8901234567891',
                createdBy: adminUser._id
            },
            {
                name: 'Ibuprofen 400mg',
                genericName: 'Ibuprofen',
                category: categories[1]._id,
                manufacturer: 'Dr. Reddy Laboratories',
                unit: 'tablet',
                price: 22.00,
                costPrice: 12.00,
                quantity: 180,
                reorderLevel: 30,
                batchNumber: 'BATCH-2024-IB400',
                expiryDate: new Date('2026-08-20'),
                barcode: '8901234567892',
                createdBy: adminUser._id
            },
            {
                name: 'Atorvastatin 10mg',
                genericName: 'Atorvastatin Calcium',
                category: categories[3]._id,
                manufacturer: 'Lupin Pharmaceuticals',
                unit: 'tablet',
                price: 65.00,
                costPrice: 40.00,
                quantity: 5, // Low stock
                reorderLevel: 15,
                batchNumber: 'BATCH-2024-AT10',
                expiryDate: new Date('2026-05-10'),
                barcode: '8901234567893',
                createdBy: adminUser._id
            },
            {
                name: 'Cetirizine 10mg',
                genericName: 'Cetirizine Hydrochloride',
                category: categories[5]._id,
                manufacturer: 'Cipla Healthcare',
                unit: 'tablet',
                price: 18.00,
                costPrice: 9.00,
                quantity: 300,
                reorderLevel: 40,
                batchNumber: 'BATCH-2024-CT10',
                expiryDate: new Date('2027-01-01'),
                barcode: '8901234567894',
                createdBy: adminUser._id
            },
            {
                name: 'Vitamin C 500mg Chewable',
                genericName: 'Ascorbic Acid',
                category: categories[4]._id,
                manufacturer: 'Sun Pharmaceutical Ltd',
                unit: 'tablet',
                price: 35.00,
                costPrice: 18.00,
                quantity: 150,
                reorderLevel: 25,
                batchNumber: 'BATCH-2024-VTC500',
                expiryDate: new Date('2026-11-30'),
                barcode: '8901234567895',
                createdBy: adminUser._id
            }
        ]);

        console.log('Seeding Initial Stock Inventory Logs...');
        for (const med of medicines) {
            await Inventory.create({
                medicine: med._id,
                medicineName: med.name,
                transactionType: 'purchase',
                quantity: med.quantity,
                balanceAfter: med.quantity,
                reference: 'Initial Stock',
                notes: 'System initialization stock',
                createdBy: adminUser._id
            });
        }

        console.log('Seeding Low Stock Notifications...');
        await Notification.create([
            {
                title: 'Low Stock Alert',
                message: 'Amoxicillin 500mg is running low. Current stock: 8 (Threshold: 20)',
                type: 'low_stock',
                relatedId: medicines[1]._id
            },
            {
                title: 'Low Stock Alert',
                message: 'Atorvastatin 10mg is running low. Current stock: 5 (Threshold: 15)',
                type: 'low_stock',
                relatedId: medicines[3]._id
            }
        ]);

        console.log('Seeding Patients...');
        const patients = await Patient.create([
            { name: 'John Michael', age: 45, gender: 'male', phone: '+91 9811122233', email: 'john.m@example.com', address: '123 Park Street, Delhi', medicalHistory: 'Hypertension', allergies: 'Penicillin', createdBy: doctorUser._id },
            { name: 'Priya Sharma', age: 32, gender: 'female', phone: '+91 9822233344', email: 'priya.s@example.com', address: '45 Lake View, Mumbai', medicalHistory: 'Asthma', allergies: 'Dust', createdBy: doctorUser._id },
            { name: 'Amitabh Patel', age: 58, gender: 'male', phone: '+91 9833344455', email: 'amitabh.p@example.com', address: '78 Ring Road, Ahmedabad', medicalHistory: 'Diabetes Type 2', allergies: 'None', createdBy: doctorUser._id }
        ]);

        console.log('Seeding Prescriptions...');
        const p1 = new Prescription({
            patient: patients[0]._id,
            patientName: 'John Michael',
            patientAge: 45,
            patientPhone: '+91 9811122233',
            doctor: doctorUser._id,
            issuedBy: doctorUser._id,
            doctorName: doctorUser.name,
            diagnosis: 'Upper Respiratory Infection',
            medicines: [
                { medicine: medicines[0]._id, medicineName: medicines[0].name, dosage: '1 Tablet', frequency: '1-0-1', duration: '5 days', quantity: 10 },
                { medicine: medicines[4]._id, medicineName: medicines[4].name, dosage: '1 Tablet', frequency: '0-0-1', duration: '5 days', quantity: 5 }
            ],
            notes: 'Drink plenty of water and rest.',
            status: 'active'
        });
        await p1.save();

        const p2 = new Prescription({
            patientName: 'Priya Sharma',
            patientAge: 32,
            patientPhone: '+91 9822233344',
            doctor: doctorUser._id,
            doctorName: doctorUser.name,
            diagnosis: 'Mild Fever & Body Pain',
            medicines: [
                { medicine: medicines[0]._id, medicineName: medicines[0].name, dosage: '1 Tablet', frequency: '1-1-1', duration: '3 days', quantity: 9 },
                { medicine: medicines[2]._id, medicineName: medicines[2].name, dosage: '1 Tablet', frequency: '1-0-1', duration: '3 days', quantity: 6 }
            ],
            notes: 'Take after meals.',
            status: 'dispensed',
            dispensedBy: users[1]._id,
            dispensedAt: new Date()
        });
        await p2.save();

        console.log('Seeding Orders...');
        const o1 = new Order({
            customer: { name: 'Priya Sharma', phone: '+91 9822233344', email: 'priya@example.com' },
            items: [
                { medicine: medicines[0]._id, medicineName: medicines[0].name, quantity: 9, unitPrice: medicines[0].price, total: medicines[0].price * 9 },
                { medicine: medicines[2]._id, medicineName: medicines[2].name, quantity: 6, unitPrice: medicines[2].price, total: medicines[2].price * 6 }
            ],
            subtotal: (medicines[0].price * 9) + (medicines[2].price * 6),
            discount: 0,
            tax: 0,
            total: (medicines[0].price * 9) + (medicines[2].price * 6),
            status: 'delivered',
            createdBy: users[1]._id
        });
        await o1.save();

        const o2 = new Order({
            customer: { name: 'Rahul Verma', phone: '+91 9833344455', email: 'rahul@example.com' },
            items: [
                { medicine: medicines[5]._id, medicineName: medicines[5].name, quantity: 2, unitPrice: medicines[5].price, total: medicines[5].price * 2 }
            ],
            subtotal: medicines[5].price * 2,
            discount: 5,
            tax: 0,
            total: (medicines[5].price * 2) - 5,
            status: 'pending',
            createdBy: adminUser._id
        });
        await o2.save();

        console.log('Seeding Audit Logs...');
        await AuditLog.create([
            { action: 'system_seed', module: 'auth', userName: 'System', details: 'Database seeded with default ERP data', status: 'success' },
            { action: 'login', module: 'auth', userId: adminUser._id, userName: adminUser.name, userRole: adminUser.role, details: 'Admin logged in', status: 'success' }
        ]);

        console.log('✅ SEEDING COMPLETE!');
        console.log('-----------------------------------');
        console.log('Default Accounts:');
        console.log('Admin:       admin@pharmacy.com       / Admin@123');
        console.log('Pharmacist:  pharmacist@pharmacy.com  / Pharma@123');
        console.log('Doctor:      doctor@pharmacy.com      / Doctor@123');
        console.log('-----------------------------------');

        mongoose.connection.close();
    } catch (err) {
        console.error('Seeding Error:', err);
        mongoose.connection.close();
    }
}

seed();
