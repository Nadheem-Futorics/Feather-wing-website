import type { NextConfig } from "next";

/**
 * CSP note: this app relies on inline `style={{...}}` props extensively
 * (React JSX) and on Next.js's own framework bootstrap script, so this uses
 * the "without nonces" CSP tier documented by Next.js (allows 'unsafe-inline'
 * for script/style) rather than a nonce-based policy — a nonce policy would
 * force every route into dynamic rendering (losing static prerendering /
 * Core Web Vitals) purely to cover inline styles that are load-bearing UI,
 * not user input. See node_modules/next/dist/docs/.../content-security-policy.md.
 * Revisit if/when third-party scripts (analytics, ads) are added — this
 * policy currently allows no third-party script or connect origins at all.
 */
const isDev = process.env.NODE_ENV === "development";

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://*.tile.openstreetmap.org",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
];

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives.join("; ") },
  // Browsers ignore this over plain HTTP, so it's a no-op in local/dev and
  // only takes effect once the production deployment terminates HTTPS.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // microphone=(self) is required — the concierge chat widget's voice
    // input (src/components/ChatWidget.tsx) uses SpeechRecognition.
    value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        // Non-fingerprinted static media (video posters, frame sequences,
        // clips) — long-lived but revalidated, not "immutable", since
        // filenames aren't content-hashed and may be replaced in place.
        source: "/(videos|media|frames|brand)/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
