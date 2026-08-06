const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const inventorySchema = new Schema({
    medicine: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
    medicineName: { type: String },
    transactionType: { type: String, enum: ['purchase', 'sale', 'return', 'adjustment', 'dispense', 'expired'], required: true },
    quantity: { type: Number, required: true }, // positive = in, negative = out
    balanceAfter: { type: Number, required: true },
    reference: { type: String }, // order ID, prescription ID, etc.
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Inventory', inventorySchema);
