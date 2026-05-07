import { createHash } from 'crypto';
import AuditLog from '../models/AuditLog.js';

function stableStringify(value) {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const keys = Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort();

  const serialized = keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',');

  return `{${serialized}}`;
}

export async function recordSecurityEvent(eventName, payload = {}) {
  const safeEventName = typeof eventName === 'string' && eventName.trim()
    ? eventName.trim()
    : 'UnknownEvent';

  const normalizedPayload = {
    ...payload,
  };

  if (normalizedPayload.userId) {
    normalizedPayload.userId = normalizedPayload.userId.toString();
  }

  const digestSource = `${safeEventName}|${Date.now()}|${stableStringify(normalizedPayload)}`;
  const digest = createHash('sha256').update(digestSource).digest('hex');

  const logEntry = await AuditLog.create({
    eventName: safeEventName,
    userId: normalizedPayload.userId,
    orgId: normalizedPayload.org || normalizedPayload.orgId,
    scope: normalizedPayload.scope,
    status: normalizedPayload.status,
    digest,
    payload: normalizedPayload,
  });

  return logEntry.digest;
}
