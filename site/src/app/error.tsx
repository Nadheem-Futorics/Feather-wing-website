"use client";

import { useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

/**
 * Root error boundary — catches unhandled render/render-path errors in any
 * page and shows a branded recovery screen instead of a blank crash.
 * Next.js still returns a 500 status for the underlying response.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Server-side details are already captured by Next's server logs; this
    // client-side log is for local debugging only and never shown to users.
    console.error("[app-error]", error);
  }, [error]);

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
      <p className="kicker">Something went wrong</p>
      <h1 className="serif" style={{ fontSize: "clamp(1.8rem, 5vw, 3rem)", color: "var(--white)" }}>
        We hit some turbulence.
      </h1>
      <p style={{ maxWidth: 480, opacity: 0.8, lineHeight: 1.6 }}>
        An unexpected error occurred. Please try again — if the problem continues, contact us directly so we
        can help.
      </p>
      <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.4rem" }}>
        <button type="button" onClick={reset} className="btn btn-gold">
          Try Again
        </button>
        <Link href="/" className="btn btn-ghost">
          Return Home
        </Link>
      </div>
    </main>
  );
}
