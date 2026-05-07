import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    org_id: String,
    message: String,
    status: { type: String, enum: ['active', 'ack'], default: 'active' },
    timestamp: Date,
    security_hash: { type: String, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.Alert || mongoose.model('Alert', AlertSchema);
