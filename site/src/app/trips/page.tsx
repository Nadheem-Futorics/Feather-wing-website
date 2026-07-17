"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./planner.css";
import PlannerShell from "@/components/planner/PlannerShell";
import { useLang } from "@/lib/i18n";
import { tp } from "@/lib/tp-i18n";
import { api, type TripDto } from "@/lib/tp-client";

export default function TripsPage() {
  const { t, lang } = useLang();
  const [trips, setTrips] = useState<(TripDto & { role: string })[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ trips: (TripDto & { role: string })[] }>("/api/tp/trips")
      .then((d) => setTrips(d.trips))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <PlannerShell>
      <div className="tpNarrow">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.6rem" }}>
          <div>
            <p className="kicker">{t(tp.tripPlanner)}</p>
            <h1 className="serif tpH1">{t(tp.myTrips)}</h1>
          </div>
          <Link href="/trips/new" className="tpBtn tpBtnGold">+ {t(tp.newTrip)}</Link>
        </div>

        {error && <div className="tpEmpty" role="alert">{error}</div>}
        {!trips && !error && (<><div className="tpSkeleton" /><div className="tpSkeleton" /><div className="tpSkeleton" /></>)}
        {trips?.length === 0 && (
          <div className="tpEmpty">
            {t({ en: "No trips yet — start your first journey.", ar: "لا رحلات بعد — ابدأ رحلتك الأولى." })}
            <div style={{ marginTop: "1rem" }}>
              <Link href="/trips/new" className="tpBtn tpBtnGold">{t(tp.startPlanning)}</Link>
            </div>
          </div>
        )}
        {trips?.map((trip) => (
          <Link key={trip.id} href={`/trips/${trip.id}`} style={{ display: "block" }}>
            <div className="tpCard" style={{ marginBottom: "0.7rem", display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <strong style={{ color: "var(--white)", fontSize: "1.05rem" }}>{trip.name}</strong>
                <div className="tpMuted" style={{ marginTop: 4 }}>
                  {trip.startDate ? new Date(trip.startDate).toLocaleDateString(lang === "ar" ? "ar" : "en", { day: "numeric", month: "short", year: "numeric" }) : t({ en: "Dates flexible", ar: "تواريخ مرنة" })}
                  {" · "}{trip.adults + trip.children} {t({ en: "travellers", ar: "مسافرين" })}
                </div>
              </div>
              <span className="tpBadge" style={{ alignSelf: "center" }}>{trip.role}</span>
            </div>
          </Link>
        ))}
      </div>
    </PlannerShell>
  );
}
