import crypto from 'crypto';

const KEY_B64 = process.env.ENCRYPTION_KEY || '';
if (!KEY_B64) {
  console.warn('ENCRYPTION_KEY not set — encryption helpers will throw if used.');
}

function getKey() {
  if (!KEY_B64) throw new Error('ENCRYPTION_KEY not configured');
  // support base64 or hex
  let buf;
  try {
    buf = Buffer.from(KEY_B64, 'base64');
    if (buf.length !== 32) {
      // try hex
      buf = Buffer.from(KEY_B64, 'hex');
    }
  } catch (e) {
    buf = Buffer.from(KEY_B64, 'hex');
  }
  if (buf.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes (base64 or hex)');
  return buf;
}

export function encrypt(text) {
  const key = getKey();
  const iv = crypto.randomBytes(12); // recommended 12 bytes for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(text, 'utf8')), cipher.final()]);
  const tag = cipher.getAuthTag();
  // store as base64: iv (12) + tag (16) + ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(b64) {
  const key = getKey();
  const data = Buffer.from(b64, 'base64');
  const iv = data.slice(0, 12);
  const tag = data.slice(12, 28);
  const encrypted = data.slice(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
