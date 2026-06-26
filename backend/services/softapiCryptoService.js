import crypto from 'crypto';

function trim(value) {
  return String(value ?? '').trim();
}

export function maskSoftApiSecret(value) {
  const str = trim(value);
  if (!str) return '';
  if (str.length <= 8) return '****';
  return `${str.slice(0, 6)}****${str.slice(-4)}`;
}

export function validateSoftApiSecret(secret) {
  const key = trim(secret);
  if (key.length !== 32) {
    const error = new Error('SOFTAPI_SECRET must be exactly 32 characters');
    error.statusCode = 500;
    error.code = 'SOFTAPI_SECRET_INVALID';
    throw error;
  }
  return key;
}

export function encryptSoftApiPayload(payload, secret) {
  const key = Buffer.from(validateSoftApiSecret(secret), 'utf8');
  const plaintext = JSON.stringify(payload);
  const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return encrypted.toString('base64');
}

export function buildSoftApiLaunchQuery(payload, secret, token) {
  const encrypted = encryptSoftApiPayload(payload, secret);
  const params = new URLSearchParams({
    payload: encrypted,
    token: trim(token),
  });
  return params.toString();
}

export default {
  encryptSoftApiPayload,
  buildSoftApiLaunchQuery,
  validateSoftApiSecret,
  maskSoftApiSecret,
};
