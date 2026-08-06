const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const prescriptionSchema = new Schema({
    prescriptionNo: { type: String, unique: true },
    patient: { type: Schema.Types.ObjectId, ref: 'Patient' },
    patientName: { type: String, required: true, trim: true },
    patientAge: { type: Number, required: true },
    patientPhone: { type: String, trim: true },
    doctor: { type: Schema.Types.ObjectId, ref: 'User' },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    doctorName: { type: String },
    diagnosis: { type: String, trim: true },
    medicines: [{
        medicine: { type: Schema.Types.ObjectId, ref: 'Medicine' },
        medicineName: { type: String },
        dosage: { type: String },
        frequency: { type: String },
        duration: { type: String },
        instructions: { type: String },
        quantity: { type: Number, default: 1 }
    }],
    notes: { type: String, trim: true },
    status: { type: String, enum: ['active', 'dispensed', 'cancelled'], default: 'active' },
    dispensedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    dispensedAt: { type: Date },
    date: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

prescriptionSchema.pre('save', async function(next) {
    if (!this.prescriptionNo) {
        const count = await mongoose.model('Prescription').countDocuments();
        this.prescriptionNo = 'RX-' + String(count + 1).padStart(5, '0');
    }
    next();
});

module.exports = mongoose.model('Prescription', prescriptionSchema);