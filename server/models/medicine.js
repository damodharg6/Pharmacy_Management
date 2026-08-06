const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const medicineSchema = new Schema({
    name: { type: String, required: true, trim: true },
    genericName: { type: String, trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    manufacturer: { type: String, trim: true },
    unit: { type: String, enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'bottle', 'strip', 'box', 'pack', 'vial', 'ampoule', 'other'], default: 'tablet' },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0 },
    quantity: { type: Number, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 10 },
    batchNumber: { type: String, trim: true },
    expiryDate: { type: Date },
    barcode: { type: String, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Virtual: isLowStock
medicineSchema.virtual('isLowStock').get(function() {
    return this.quantity <= this.reorderLevel;
});

medicineSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Medicine', medicineSchema);
