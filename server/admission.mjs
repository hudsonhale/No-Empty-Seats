import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function issueAdmission(secret, { lifetimeHours = 24, now = Date.now() } = {}) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('ADMISSION_SECRET must contain at least 32 characters.');
  const payload = Buffer.from(JSON.stringify({ nonce: randomBytes(12).toString('hex'), expires: now + lifetimeHours * 3600000 })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyAdmission(code, secret, now = Date.now()) {
  if (!secret || typeof code !== 'string' || code.length > 512) return null;
  const pieces = code.split('.');
  if (pieces.length !== 2) return null;
  const [payload, signature] = pieces;
  const expected = createHmac('sha256', secret).update(payload).digest();
  let actual;
  try { actual = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!/^[a-f0-9]{24}$/.test(value.nonce) || !Number.isFinite(value.expires) || value.expires <= now) return null;
    return value;
  } catch { return null; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const count = Number(process.argv[2] || 1);
  if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error('Usage: node --env-file-if-exists=.env server/admission.mjs [count: 1–1000]');
  for (let i = 0; i < count; i++) console.log(issueAdmission(process.env.ADMISSION_SECRET));
}
