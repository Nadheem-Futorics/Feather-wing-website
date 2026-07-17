import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";

// Next.js always serves this with a real 404 HTTP status — no extra
// config needed. Keep it out of the index just in case a stale/broken
// external link gets crawled directly.
export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "2rem 1.2rem",
        gap: "1.4rem",
      }}
    >
      <Logo height={40} />
      <p className="kicker">404</p>
      <h1 className="serif" style={{ fontSize: "clamp(1.8rem, 5vw, 3rem)", color: "var(--white)" }}>
        This page has flown off course.
      </h1>
      <p style={{ maxWidth: 480, opacity: 0.8, lineHeight: 1.6 }}>
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved. Let&rsquo;s get you back on
        track.
      </p>
      <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.4rem" }}>
        <Link href="/" className="btn btn-gold">
          Return Home
        </Link>
        <Link href="/trip-planner" className="btn btn-ghost">
          Plan a Trip
        </Link>
      </div>
    </main>
  );
}
