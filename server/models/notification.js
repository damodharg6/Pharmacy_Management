const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['low_stock', 'new_order', 'order_completed', 'new_user', 'new_prescription', 'info', 'warning', 'error'], default: 'info' },
    isRead: { type: Boolean, default: false },
    link: { type: String }, // optional route link
    relatedId: { type: Schema.Types.ObjectId }, // related resource ID
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
