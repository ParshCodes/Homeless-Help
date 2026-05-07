import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'safespot-key').digest();

export function encryptField(value) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  const hash = crypto.createHash('sha256').update(encrypted).digest('hex');
  return { iv: iv.toString('hex'), tag: tag.toString('hex'), data: encrypted.toString('hex'), hash };
}
