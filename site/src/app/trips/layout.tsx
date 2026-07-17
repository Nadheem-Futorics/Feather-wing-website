import type { Metadata } from "next";

/**
 * /trips/* is the authenticated trip-planner app (a user's own trips,
 * itinerary, budget, documents, and invite-acceptance links containing
 * tokens) — none of it is public marketing content. The public landing
 * page for this feature is /trip-planner, which has its own indexable
 * metadata. Keeping this subtree out of the index also avoids leaking
 * invite-token URLs (/trips/join?token=...) to search engines.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function TripsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
