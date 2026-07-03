import { hash, verify } from "@node-rs/argon2";

// argon2id with library defaults — no tuning needed at this scale.
export function hashPassword(plain: string): Promise<string> {
  return hash(plain);
}

// Never throws: a malformed stored hash reads as "wrong password".
export async function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  try {
    return await verify(passwordHash, plain);
  } catch {
    return false;
  }
}
