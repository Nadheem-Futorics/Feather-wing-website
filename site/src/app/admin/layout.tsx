import type { Metadata } from "next";

/**
 * Every /admin/* route is either the login page or requires an authenticated
 * session (gated server-side in src/proxy.ts) — none of it is content meant
 * for search engines, and indexing it would leak internal tooling URLs.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
