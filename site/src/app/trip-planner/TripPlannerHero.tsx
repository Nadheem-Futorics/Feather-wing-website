"use client";

import PlannerShell from "@/components/planner/PlannerShell";
import { useLang } from "@/lib/i18n";
import { tp } from "@/lib/tp-i18n";
import { clipPaths } from "@/data/clips";

export default function TripPlannerHero({ cta }: { cta: React.ReactNode }) {
  const { t } = useLang();
  const features: { en: string; ar: string }[] = [
    { en: "Day-by-day itinerary with drag-and-drop and travel times", ar: "برنامج يومي بالسحب والإفلات مع أزمنة التنقل" },
    { en: "Discover attractions, restaurants and hotels on an interactive map", ar: "اكتشف المعالم والمطاعم والفنادق على خريطة تفاعلية" },
    { en: "AI assistant that drafts and refines your plan — you approve every change", ar: "مساعد ذكي يقترح خطتك ويحسّنها — وأنت توافق على كل تغيير" },
    { en: "Smart day optimization around opening hours and your pace", ar: "تحسين ذكي لليوم وفق ساعات العمل وإيقاعك" },
    { en: "Collaborate with family and friends, track budget and documents", ar: "تعاون مع العائلة والأصدقاء وتابع الميزانية والمستندات" },
    { en: "Turn the finished plan into a custom Feather Wing Tours quote", ar: "حوّل الخطة الجاهزة إلى عرض سعر مخصص من فذر وينغ تورز" },
  ];
  return (
    <PlannerShell>
      <div className="tpNarrow" style={{ textAlign: "center" }}>
        <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", marginBottom: "2rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={clipPaths("FW_HERO_31_GoldenHorizon").poster} alt="" style={{ width: "100%", aspectRatio: "16/6", objectFit: "cover" }} />
          <div className="vignette" />
        </div>
        <p className="kicker">{t(tp.tripPlanner)}</p>
        <h1 className="serif tpH1" style={{ marginBlock: "0.8rem 1rem" }}>{t(tp.heroTitle)}</h1>
        <p className="tpMuted" style={{ maxWidth: 620, marginInline: "auto" }}>{t(tp.heroCopy)}</p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginBlock: "1.8rem 2.6rem", flexWrap: "wrap" }}>{cta}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.8rem", textAlign: "start" }}>
          {features.map((f, i) => (
            <div key={i} className="tpCard" style={{ fontSize: "0.88rem", lineHeight: 1.6 }}>
              <span style={{ color: "var(--gold)" }}>✦</span> {t(f)}
            </div>
          ))}
        </div>
      </div>
    </PlannerShell>
  );
}
