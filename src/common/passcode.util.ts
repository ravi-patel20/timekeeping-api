import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const PASSCODE_REGEX = /^\d{4}$/;
const KEY_LENGTH = 64;

export const validatePasscode = (passcode: string): boolean => PASSCODE_REGEX.test(passcode);

export const hashPasscode = (passcode: string): string => {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(passcode, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${derived}`;
};

export const isLegacyPasscode = (stored: string): boolean => !stored.includes(':');

export const verifyPasscode = (passcode: string, stored: string): boolean => {
  if (isLegacyPasscode(stored)) {
    return stored === passcode;
  }
  const [salt, digest] = stored.split(':', 2);
  if (!salt || !digest) return false;
  const derived = scryptSync(passcode, salt, KEY_LENGTH).toString('hex');
  try {
    return timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(derived, 'hex'));
  } catch {
    return false;
  }
};
