import { scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from 'crypto';

const SCRYPT_OPTIONS: ScryptOptions = { cost: 16384, blockSize: 8, parallelization: 1 };

function scryptAsync(password: string, salt: string, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const raw = await scryptAsync(password, salt, 64, SCRYPT_OPTIONS) as Buffer;
  return raw.toString('hex');
}

export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const actualHash = await hashPassword(password, salt);
  const actual = Buffer.from(actualHash, 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
