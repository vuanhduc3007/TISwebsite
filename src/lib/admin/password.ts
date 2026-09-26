import "server-only";

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 32;
const N = 131_072;
const R = 8;
const P = 1;
const MAX_MEMORY = 256 * 1024 * 1024;
const MIN_SALT_LENGTH = 16;
const MAX_SALT_LENGTH = 64;
const MIN_HASH_LENGTH = 16;
const MAX_HASH_LENGTH = 64;

// A deliberately non-matching hash that keeps unknown-account logins on the
// same expensive verification path as known accounts.
export const DUMMY_PASSWORD_HASH = `scrypt$${N}$${R}$${P}$${Buffer.from("tis-admin-login!").toString("base64url")}$${Buffer.alloc(KEY_LENGTH).toString("base64url")}`;

function deriveKey(password: string, salt: Buffer, length: number, options: { N: number; r: number; p: number; maxmem: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, length, options, (error, key) => error ? reject(error) : resolve(key));
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: MAX_MEMORY });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, nValue, rValue, pValue, saltValue, hashValue] = encoded.split("$");
  if (algorithm !== "scrypt" || !nValue || !rValue || !pValue || !saltValue || !hashValue) {
    return false;
  }

  const cost = Number(nValue);
  const blockSize = Number(rValue);
  const parallelism = Number(pValue);
  const salt = Buffer.from(saltValue, "base64url");
  const expected = Buffer.from(hashValue, "base64url");
  const parametersAreSafe = Number.isSafeInteger(cost)
    && cost === N
    && Number.isSafeInteger(blockSize)
    && blockSize === R
    && Number.isSafeInteger(parallelism)
    && parallelism === P
    && /^[A-Za-z0-9_-]+$/.test(saltValue)
    && /^[A-Za-z0-9_-]+$/.test(hashValue)
    && salt.length >= MIN_SALT_LENGTH
    && salt.length <= MAX_SALT_LENGTH
    && expected.length >= MIN_HASH_LENGTH
    && expected.length <= MAX_HASH_LENGTH;
  if (!parametersAreSafe) return false;

  try {
    const actual = await deriveKey(password, salt, expected.length, {
      N: cost,
      r: blockSize,
      p: parallelism,
      maxmem: MAX_MEMORY
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
