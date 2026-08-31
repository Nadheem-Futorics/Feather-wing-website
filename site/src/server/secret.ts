/**
 * The HMAC key behind guest sessions, admin sessions, and signed document
 * URLs (session.ts, docs.ts, proxy.ts).
 *
 * This used to fall back to a hardcoded constant everywhere, including in
 * production. That is a silent security hole rather than a convenience: this
 * repository is public, so the fallback below is a published value, and a
 * deployment missing SESSION_SECRET would happily verify admin session
 * cookies that anyone could forge from it — exposing the CRM's customer
 * enquiries (names, emails, phone numbers). Nothing in the app's behaviour
 * would look wrong, which is what makes it dangerous.
 *
 * So the fallback stays for local development, where it keeps the app
 * runnable with no setup, and production refuses to start signing without a
 * real secret.
 */

/** Known-public value — safe only because it is rejected in production. */
const DEV_FALLBACK = "fwt-dev-session-secret-change-me";

export function sessionSecret(): string {
  const configured = process.env.SESSION_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is not set. Refusing to sign sessions with the development " +
        "fallback, which is published in this repository and would let anyone forge " +
        "an admin session. Set SESSION_SECRET to a random 32+ character string.",
    );
  }
  return DEV_FALLBACK;
}
