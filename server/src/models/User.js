import mongoose from 'mongoose';

const MedicalInfoSchema = new mongoose.Schema({
  conditions: String,
  allergies: String,
  meds: String,
  vaccinations: String,
});

const MedicalDocSchema = new mongoose.Schema({
  file_url: String,
  uploaded_by: String,
  uploaded_at: Date,
});

const EmergencyContactSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
});

const HistorySchema = new mongoose.Schema({
  field: String,
  editor: String,
  note: String,
  timestamp: Date,
});

const UserSchema = new mongoose.Schema(
  {
    name: String,
    sex: String,
    dob: String,
    ssn_encrypted: String,
    qr_code_url: String,
    emergency_contacts: [EmergencyContactSchema],
    medical_info_encrypted: MedicalInfoSchema,
    medical_docs: [MedicalDocSchema],
    service_history: [HistorySchema],
    urgent_flag: Boolean,
    consent_expires: String,
  },
  { timestamps: true }
);

UserSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

export default mongoose.models.User || mongoose.model('User', UserSchema);
