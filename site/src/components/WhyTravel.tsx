"use client";

import React from "react";
import { useLang, dict } from "@/lib/i18n";
import styles from "./WhyTravel.module.css";

const icons = [
  // Carefully Planned — route
  <path key="0" d="M8 34 Q16 20 24 26 T40 14 M40 14 l-6 1 M40 14 l-2 6" />,
  // Trusted Support — shield
  <path key="1" d="M24 6 L38 12 V24 Q38 36 24 42 Q10 36 10 24 V12 Z M17 24 l5 5 9-11" />,
  // Comfort and Safety — hand + heart
  <path key="2" d="M10 30 Q10 22 18 22 H30 M24 42 Q10 38 8 30 M24 14 c-3-5-10-3-10 2 0 4 5 7 10 11 5-4 10-7 10-11 0-5-7-7-10-2 Z" />,
  // Meaningful Experiences — star
  <path key="3" d="M24 8 l4.6 9.6 10.4 1.4 -7.6 7.2 1.9 10.3 -9.3-5 -9.3 5 1.9-10.3 -7.6-7.2 10.4-1.4 Z" />,
  // Flexible Solutions — layered squares
  <path key="4" d="M14 14 h14 v14 h-14 Z M20 20 h14 v14 h-14 Z" />,
];

export default function WhyTravel() {
  const { t } = useLang();
  return (
    <section className={`section ${styles.root}`} aria-label={t(dict.why.kicker)}>
      <div className="wrap">
        <p className="kicker">{t(dict.why.kicker)}</p>
        <h2 className="section-title serif">{t(dict.why.title)}</h2>
        <ul className={styles.grid}>
          {dict.why.points.map((p, i) => (
            <li key={i} className={styles.item}>
              <svg width="44" height="44" viewBox="0 0 48 48" fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {icons[i]}
              </svg>
              <h3 className="serif">{t(p.title)}</h3>
              <p>{t(p.copy)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
