import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';

const EmergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const MedicalConditionSchema = new mongoose.Schema(
  {
    conditionName: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
  },
  { _id: false }
);

const DocumentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PhotoSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const LocationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length === 2;
        },
        message: 'Location coordinates must be a [longitude, latitude] pair.',
      },
    },
    address: { type: String, trim: true },
  },
  { _id: false }
);

const PersonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number },
    dateOfBirth: { type: Date },
    gender: { type: String, trim: true },
    ssn: { type: String, trim: true },
    medicalInfo: { type: String },
    emergencyContact: { type: String },
    emergencyContacts: { type: [EmergencyContactSchema], default: [] },
    medicalConditions: { type: [MedicalConditionSchema], default: [] },
    documents: { type: [DocumentSchema], default: [] },
    photo: { type: PhotoSchema, required: true },
    barcodeId: { type: String, unique: true, index: true },
    location: { type: LocationSchema },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

PersonSchema.index({ location: '2dsphere' });

const randomBarcodeSegment = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

PersonSchema.pre('save', function generateBarcodeId(next) {
  if (!this.barcodeId) {
    const timestampBase36 = Date.now().toString(36);
    const randomId = randomBarcodeSegment();
    this.barcodeId = `SPOT-${timestampBase36}-${randomId}`;
  }

  next();
});

PersonSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

export default mongoose.models.Person || mongoose.model('Person', PersonSchema);
