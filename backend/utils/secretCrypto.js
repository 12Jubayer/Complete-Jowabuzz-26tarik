import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

function getEncryptionKey() {
  const source = process.env.SMS_ENCRYPTION_KEY || process.env.JWT_SECRET || 'jowabuzz-sms-dev-key';
  return crypto.createHash('sha256').update(String(source)).digest();
}

export function encryptSecret(plainText) {
  const value = String(plainText ?? '').trim();
  if (!value) return '';

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(storedValue) {
  const value = String(storedValue ?? '');
  if (!value) return '';
  if (!value.startsWith(PREFIX)) return value;

  const parts = value.slice(PREFIX.length).split(':');
  if (parts.length !== 3) return value;

  const [ivB64, tagB64, dataB64] = parts;
  const decipher = crypto.createDecipheriv(
    ALGO,
    getEncryptionKey(),
    Buffer.from(ivB64, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function maskSecret(value) {
  const str = String(value || '').trim();
  if (!str) return '';
  if (str.length <= 4) return '****';
  return `${'*'.repeat(Math.min(str.length - 4, 12))}${str.slice(-4)}`;
}

export function shouldUpdateSecret(incoming, existingDecrypted) {
  const value = String(incoming ?? '').trim();
  if (!value) return false;
  if (value.includes('****') && value === maskSecret(existingDecrypted)) return false;
  return true;
}
