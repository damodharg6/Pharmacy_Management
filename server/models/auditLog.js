const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const auditLogSchema = new Schema({
    action: { type: String, required: true }, // 'login', 'logout', 'create_user', 'update_medicine', etc.
    module: { type: String, required: true }, // 'auth', 'user', 'medicine', 'order', etc.
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String },
    userRole: { type: String },
    details: { type: String },
    ipAddress: { type: String },
    status: { type: String, enum: ['success', 'failure'], default: 'success' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
