import { createHmac, timingSafeEqual } from "node:crypto";
import { sessionSecret } from "./secret";

/** Signed, expiring tokens for private document URLs. */

const TTL_MS = 15 * 60 * 1000;

export function signDocToken(docId: string, now = Date.now()): string {
  const exp = now + TTL_MS;
  const sig = createHmac("sha256", sessionSecret()).update(`doc:${docId}:${exp}`).digest("base64url");
  return `${exp}.${sig}`;
}

export function verifyDocToken(docId: string, token: string | null): boolean {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < Date.now()) return false;
  const expected = createHmac("sha256", sessionSecret()).update(`doc:${docId}:${exp}`).digest("base64url");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}
