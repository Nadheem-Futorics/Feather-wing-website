"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n";
import { tp } from "@/lib/tp-i18n";
import Logo from "../Logo";

/** Header + chrome for all /trips pages, in the site's design language. */
export default function PlannerShell({ tripId, children }: { tripId?: string; children: React.ReactNode }) {
  const { t, lang, setLang } = useLang();
  const pathname = usePathname();

  const tripLinks = tripId
    ? [
        { href: `/trips/${tripId}`, label: t(tp.planner.plan) },
        { href: `/trips/${tripId}/budget`, label: t(tp.planner.budget) },
        { href: `/trips/${tripId}/documents`, label: t(tp.planner.documents) },
        { href: `/trips/${tripId}/checklists`, label: t(tp.planner.checklists) },
        { href: `/trips/${tripId}/share`, label: t(tp.planner.share) },
        { href: `/trips/${tripId}/quote`, label: t(tp.planner.quote) },
      ]
    : [];

  return (
    <div className="tpShell">
      <header className="tpHeader">
        <Link href="/" aria-label="Feather Wing Tours — home" style={{ flexShrink: 0 }}>
          <Logo height={34} />
        </Link>
        <nav aria-label={t(tp.tripPlanner)} style={{ overflowX: "auto" }}>
          <Link href="/trips" className={pathname === "/trips" ? "tpActive" : ""}>{t(tp.myTrips)}</Link>
          {tripLinks.map((l) => (
            <Link key={l.href} href={l.href} className={pathname === l.href ? "tpActive" : ""}>
              {l.label}
            </Link>
          ))}
        </nav>
        <button
          className="tpBtn tpBtnSm"
          onClick={() => setLang(lang === "en" ? "ar" : "en")}
          aria-label={lang === "en" ? "التبديل إلى العربية" : "Switch to English"}
        >
          {lang === "en" ? "العربية" : "English"}
        </button>
      </header>
      <main id="main-content">{children}</main>
    </div>
  );
}
