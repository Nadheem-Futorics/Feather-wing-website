"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useLang, dict, type L } from "@/lib/i18n";
import { clipPaths } from "@/data/clips";
import styles from "./OfferBox.module.css";

interface Offer {
  id: string;
  scene: string;
  title: L;
  subtitle: L;
  description: L;
  badge: L;
  priceFrom: string;
  cta: L;
  ctaHref: string;
  validUntil: string;
}

const sceneToClip: Record<string, string> = {
  canyon: "FW_DEST_01_AlUla", hegra: "FW_DEST_02_Hegra", dunes: "FW_DEST_12_EmptyQuarter",
  "serene-city": "FW_DEST_11_Madinah", heritage: "FW_DEST_06_Diriyah", "elephant-rock": "FW_DEST_10_ElephantRock",
  istanbul: "FW_INTL_04_Istanbul", maldives: "FW_INTL_05_Maldives", mountains: "FW_DEST_09_Asir",
  skyline: "FW_DEST_07_Riyadh", sea: "FW_DEST_05_RedSea", london: "FW_INTL_01_London", paris: "FW_INTL_02_Paris",
  dubai: "FW_INTL_03_Dubai", switzerland: "FW_INTL_06_Switzerland", newyork: "FW_INTL_07_NewYork",
  japan: "FW_INTL_08_Japan", globe: "FW_DEST_15_ToTheWorld",
};

/** Renders the first active admin-managed offer (nothing if there are none). */
export default function OfferBox() {
  const { t } = useLang();
  const [offer, setOffer] = useState<Offer | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/tp/offers")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.ok && Array.isArray(d.data?.offers) && d.data.offers.length) {
          setOffer(d.data.offers[0] as Offer);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!offer) return null;

  return (
    <aside className={styles.box} aria-label={t(dict.offer.kicker)}>
      <div className={styles.media}>
        <Image
          src={clipPaths(sceneToClip[offer.scene] ?? "FW_DEST_12_EmptyQuarter").poster}
          alt=""
          fill
          sizes="(max-width: 900px) 100vw, 400px"
          style={{ objectFit: "cover" }}
        />
        <span className={styles.kicker}>{t(offer.badge).trim() || t(dict.offer.kicker)}</span>
      </div>
      <div className={styles.body}>
        <h3 className="serif">{t(offer.title)}</h3>
        {t(offer.subtitle).trim() && <p className={styles.subtitle}>{t(offer.subtitle)}</p>}
        {t(offer.description).trim() && <p className={styles.desc}>{t(offer.description)}</p>}
        <div className={styles.foot}>
          {offer.priceFrom.trim() && (
            <div className={styles.price}>
              <span>{t(dict.offer.from)}</span>
              <strong>{offer.priceFrom}</strong>
            </div>
          )}
          <a href={offer.ctaHref || "#enquiry"} className="btn btn-gold" data-cursor="book" style={{ minHeight: 44, padding: "0.6rem 1.5rem", fontSize: "0.8rem" }}>
            {t(offer.cta).trim() || t(dict.offer.defaultCta)}
          </a>
        </div>
        {offer.validUntil.trim() && <p className={styles.valid}>{t(dict.offer.valid)}: {offer.validUntil}</p>}
      </div>
    </aside>
  );
}
