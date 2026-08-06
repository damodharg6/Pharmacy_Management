const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderItemSchema = new Schema({
    medicine: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
    medicineName: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true }
});

const orderSchema = new Schema({
    orderNo: { type: String, unique: true },
    customer: {
        name: { type: String, required: true, trim: true },
        phone: { type: String, trim: true },
        email: { type: String, trim: true }
    },
    items: [orderItemSchema],
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'processing', 'packed', 'dispatched', 'delivered', 'cancelled'],
        default: 'pending'
    },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Auto generate order number
orderSchema.pre('save', async function(next) {
    if (!this.orderNo) {
        const count = await mongoose.model('Order').countDocuments();
        this.orderNo = 'ORD-' + String(count + 1).padStart(5, '0');
    }
    next();
});

module.exports = mongoose.model('Order', orderSchema);
