import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    eventName: { type: String, required: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    orgId: { type: String, trim: true },
    scope: { type: String, trim: true },
    status: { type: String, trim: true },
    digest: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'security_audit_logs',
  }
);

AuditLogSchema.index({ eventName: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
