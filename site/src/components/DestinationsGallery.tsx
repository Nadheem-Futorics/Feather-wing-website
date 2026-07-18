"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useLang } from "@/lib/i18n";
import styles from "./DestinationsGallery.module.css";

interface DestinationCard {
  id: string;
  title: { en: string; ar: string };
  subtitle: { en: string; ar: string };
  hasImage: boolean;
}

/** Admin-managed destination gallery — image + name only, no price. Kept separate from both the hero's video journey and the priced Featured Trips grid. */
export default function DestinationsGallery() {
  const { t } = useLang();
  const [destinations, setDestinations] = useState<DestinationCard[]>([]);

  useEffect(() => {
    let alive = true;
    fetch("/api/tp/destinations")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.ok && Array.isArray(d.data?.destinations)) setDestinations(d.data.destinations as DestinationCard[]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (destinations.length === 0) return null;

  return (
    <section id="destinations-gallery" className={`section ${styles.root}`} aria-label={t({ en: "Destinations", ar: "الوجهات" })}>
      <div className="wrap">
        <p className="kicker">{t({ en: "Explore", ar: "استكشف" })}</p>
        <h2 className="section-title serif">{t({ en: "Destinations", ar: "الوجهات" })}</h2>

        <div className={styles.grid}>
          {destinations.map((d, i) => (
            <article key={d.id} className={styles.card} style={{ animationDelay: `${i * 70}ms` }}>
              <div className={styles.cardMedia}>
                <Image
                  src={`/api/tp/destinations/image/${d.id}`}
                  alt={t(d.title)}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                  className={styles.cardImg}
                />
              </div>
              <div className={styles.cardBody}>
                <h3 className="serif">{t(d.title)}</h3>
                {t(d.subtitle) && <p className={styles.line}>{t(d.subtitle)}</p>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
