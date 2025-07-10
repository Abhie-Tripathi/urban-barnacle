export * from './sortBy';
export * from './regions';
export * from './timezones';
import * as crypto from 'crypto';
export function getNonEmptyParams(params: any) {
  return Object.keys(params).reduce(
    (acc, key) => {
      if (
        (typeof params[key] === 'string' && params[key]) ||
        (typeof params[key] === 'object' &&
          Object.keys(params[key]).length > 0) ||
        typeof params[key] === 'number' ||
        typeof params[key] === 'boolean'
      ) {
        acc[key] = params[key];
      }
      return acc;
    },
    {} as Record<string, any>,
  );
}

export function getNameFromEmail(
  email: string,
  firstname: string | null,
  lastname: string | null,
) {
  return firstname || lastname
    ? `${firstname} ${lastname || ''}`
    : email.split('@')[0];
}


const ALGORITHM = 'aes-256-cbc';
const KEY = process.env.EVENT_QUERY_ENCRYPT ?? '';
const IV = Buffer.from(process.env.EVENT_CHIPR_IV ??
  '', 'hex'); // IV must match

function getSecretKey(key: string): Buffer {
  return Buffer.from(crypto.createHash('sha256').update(key).digest('hex').substring(0, 32));
}

export function encrypt(text: string, key: string = KEY): string {
  const secretKey = getSecretKey(key);
  const cipher = crypto.createCipheriv(ALGORITHM, secretKey, IV);
  let encrypted = cipher.update(text, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function decrypt(encryptedText: string, key: string = KEY): string {
  const secretKey = getSecretKey(key);
  const decipher = crypto.createDecipheriv(ALGORITHM, secretKey, IV);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}

export interface TrackerIntelScoreJson {
  trackerId: string
  keywords: '<100' | '>100',
  createdAt: string, status: 'pending' | 'processing' | 'failed' | 'complete',
  updateAt?: string
  , user: any
}

export const REDIS_TTL = 1000 * 60 * 60 * 24 * 365;