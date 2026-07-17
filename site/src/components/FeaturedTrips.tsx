"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { trips as staticTrips, tripCategories, TripCategory, type Trip } from "@/data/trips";
import { useLang, dict } from "@/lib/i18n";
import { clipPaths } from "@/data/clips";
import styles from "./FeaturedTrips.module.css";

/** trip-card artwork = real poster frames from the destination footage */
const sceneToClip: Record<string, string> = {
  canyon: "FW_DEST_01_AlUla",
  hegra: "FW_DEST_02_Hegra",
  dunes: "FW_DEST_12_EmptyQuarter",
  "serene-city": "FW_DEST_11_Madinah",
  heritage: "FW_DEST_06_Diriyah",
  "elephant-rock": "FW_DEST_10_ElephantRock",
  istanbul: "FW_INTL_04_Istanbul",
  maldives: "FW_INTL_05_Maldives",
  mountains: "FW_DEST_09_Asir",
  skyline: "FW_DEST_07_Riyadh",
  sea: "FW_DEST_05_RedSea",
  london: "FW_INTL_01_London",
  paris: "FW_INTL_02_Paris",
  dubai: "FW_INTL_03_Dubai",
  switzerland: "FW_INTL_06_Switzerland",
  newyork: "FW_INTL_07_NewYork",
  japan: "FW_INTL_08_Japan",
  globe: "FW_DEST_15_ToTheWorld",
};

export default function FeaturedTrips() {
  const { t, lang } = useLang();
  const [cat, setCat] = useState<TripCategory | "all">("all");
  // Admin-managed trips override the static seed; fall back to static if the API is unavailable.
  const [trips, setTrips] = useState<Trip[]>(staticTrips);

  useEffect(() => {
    let alive = true;
    fetch("/api/tp/featured-trips")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.ok && Array.isArray(d.data?.trips) && d.data.trips.length) {
          setTrips(d.data.trips as Trip[]);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const visible = trips.filter((tr) => cat === "all" || tr.category === cat);

  return (
    <section id="trips" className={`section ${styles.root}`} aria-label={t(dict.trips.kicker)}>
      <div className="wrap">
        <p className="kicker">{t(dict.trips.kicker)}</p>
        <h2 className="section-title serif">{t(dict.trips.title)}</h2>
        <p className={styles.demoNote}>{t(dict.trips.demo)}</p>
        <p style={{ marginTop: "0.9rem" }}>
          <a href="/trip-planner" className="btn btn-ghost" data-cursor="explore" style={{ minHeight: 42, padding: "0.5rem 1.4rem", fontSize: "0.78rem" }}>
            {t({ en: "✦ Build your own trip in the planner", ar: "✦ صمّم رحلتك بنفسك في المخطط" })}
          </a>
        </p>

        <div className={styles.filters} role="tablist" aria-label={t({ en: "Trip categories", ar: "فئات الرحلات" })}>
          {tripCategories.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={cat === c.id}
              className={`${styles.filter} ${cat === c.id ? styles.filterOn : ""}`}
              onClick={() => setCat(c.id as TripCategory | "all")}
            >
              {lang === "ar" ? c.ar : c.en}
            </button>
          ))}
        </div>

        <div className={styles.grid}>
          {visible.map((tr, i) => (
            <article key={tr.id} className={styles.card} style={{ animationDelay: `${i * 70}ms` }}>
              <div className={styles.cardMedia}>
                <Image
                  src={clipPaths(sceneToClip[tr.scene] ?? "FW_DEST_01_AlUla").poster}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                  className={styles.cardImg}
                />
                <span className={styles.badge}>
                  {lang === "ar"
                    ? tripCategories.find((c) => c.id === tr.category)?.ar
                    : tripCategories.find((c) => c.id === tr.category)?.en}
                </span>
              </div>
              <div className={styles.cardBody}>
                <h3 className="serif">{t(tr.title)}</h3>
                <p className={styles.place}>{t(tr.place)}</p>
                <dl className={styles.meta}>
                  <div>
                    <dt>{t({ en: "Dates", ar: "التواريخ" })}</dt>
                    <dd>{t(tr.dates)}</dd>
                  </div>
                  <div>
                    <dt>{t({ en: "Duration", ar: "المدة" })}</dt>
                    <dd>{t(tr.duration)}</dd>
                  </div>
                </dl>
                <div className={styles.cardFoot}>
                  <div>
                    <span className={styles.from}>{t(dict.trips.from)}</span>
                    <span className={styles.price}>{tr.price}</span>
                    <span className={styles.seats}>
                      {tr.seats} {t(dict.trips.seats)}
                    </span>
                  </div>
                  <a href="#enquiry" className={`btn btn-ghost ${styles.viewBtn}`} data-cursor="viewTrip">
                    {t(dict.trips.view)}
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
