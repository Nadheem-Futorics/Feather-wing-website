import type { Metadata } from "next";
import Link from "next/link";
import "../trips/planner.css";
import TripPlannerHero from "./TripPlannerHero";

export const metadata: Metadata = {
  title: "Trip Planner",
  description:
    "Plan your journey day by day: multi-city itineraries, map discovery, an AI travel assistant and custom quotes from Feather Wing Tours.",
  // Without this, the page silently inherits the root layout's
  // alternates.canonical ("/"), telling search engines this page is a
  // duplicate of the homepage instead of its own indexable page.
  alternates: { canonical: "/trip-planner" },
  openGraph: {
    title: "Trip Planner | Feather Wing Tours",
    description:
      "Plan your journey day by day: multi-city itineraries, map discovery, an AI travel assistant and custom quotes from Feather Wing Tours.",
    url: "/trip-planner",
    type: "website",
  },
};

export default function TripPlannerPage() {
  return (
    <TripPlannerHero
      cta={
        <>
          <Link href="/trips/new" className="btn btn-gold">
            Start Planning
          </Link>
          <Link href="/trips" className="btn btn-ghost">
            My Trips
          </Link>
        </>
      }
    />
  );
}
