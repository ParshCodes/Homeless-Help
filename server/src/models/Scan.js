import mongoose from 'mongoose';

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

const ScanSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    org_id: String,
    coords: {
      lat: Number,
      lon: Number,
      address: { type: String, trim: true },
    },
    location: { type: LocationSchema },
    type: { type: String, trim: true, default: 'Outreach' },
    role: { type: String, trim: true },
    timestamp: Date,
    security_hash: { type: String, index: true },
  },
  { timestamps: true }
);

ScanSchema.index({ location: '2dsphere' });

export default mongoose.models.Scan || mongoose.model('Scan', ScanSchema);
