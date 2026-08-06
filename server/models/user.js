const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    nic: { type: String, trim: true, default: '' },
    number: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    role: { 
        type: String, 
        required: true, 
        default: 'pharmacist',
        set: function(r) { return r ? r.toLowerCase() : 'pharmacist'; }
    },
    password: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isActive: { type: Boolean, default: true },
    address: { type: String, trim: true, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

userSchema.index({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

userSchema.pre('save', async function(next) {
    // Keep status and isActive synchronized
    if (this.isModified('status')) {
        this.isActive = this.status === 'active';
    } else if (this.isModified('isActive')) {
        this.status = this.isActive ? 'active' : 'inactive';
    }

    // Keep phone and number synchronized
    if (this.phone && !this.number) this.number = this.phone;
    if (this.number && !this.phone) this.phone = this.number;

    // Hash password if modified
    if (!this.isModified('password')) return next();
    if (!this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!candidatePassword || !this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

