"use client";

import React from "react";
import { useLang, dict } from "@/lib/i18n";
import SceneArt from "./SceneArt";
import styles from "./About.module.css";

export default function About() {
  const { t } = useLang();
  return (
    <section id="about" className={`section ${styles.root}`} aria-label={t(dict.about.kicker)}>
      <div className={styles.bg} aria-hidden="true">
        <SceneArt scene="globe" hue="navy" />
        <div className="vignette" />
      </div>
      <div className={`wrap ${styles.inner}`}>
        <p className="kicker">{t(dict.about.kicker)}</p>
        <h2 className="section-title serif">{t(dict.about.title)}</h2>

        <p className={styles.lede}>{t(dict.about.lede)}</p>

        <div className={styles.cols}>
          <p>{t(dict.about.p1)}</p>
          <p>{t(dict.about.p2)}</p>
          <p>{t(dict.about.p3)}</p>
        </div>

        <p className={styles.goal}>{t(dict.about.goal)}</p>

        <div className={styles.vm}>
          <article className={styles.vmCard}>
            <span className={styles.vmIcon} aria-hidden="true">
              <svg width="34" height="34" viewBox="0 0 48 48" fill="none" stroke="url(#vm-g)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="vm-g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f7cb6c" />
                    <stop offset="100%" stopColor="#e5a52e" />
                  </linearGradient>
                </defs>
                <path d="M24 12C13 12 5 24 5 24s8 12 19 12 19-12 19-12-8-12-19-12Z" />
                <circle cx="24" cy="24" r="5.5" />
              </svg>
            </span>
            <h3 className="serif">{t(dict.about.visionTitle)}</h3>
            <p>{t(dict.about.vision)}</p>
          </article>

          <article className={styles.vmCard}>
            <span className={styles.vmIcon} aria-hidden="true">
              <svg width="34" height="34" viewBox="0 0 48 48" fill="none" stroke="url(#vm-g2)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="vm-g2" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f7cb6c" />
                    <stop offset="100%" stopColor="#e5a52e" />
                  </linearGradient>
                </defs>
                <circle cx="24" cy="24" r="18" />
                <circle cx="24" cy="24" r="10" />
                <circle cx="24" cy="24" r="2.5" fill="url(#vm-g2)" />
              </svg>
            </span>
            <h3 className="serif">{t(dict.about.missionTitle)}</h3>
            <p>{t(dict.about.mission1)}</p>
            <p>{t(dict.about.mission2)}</p>
          </article>
        </div>
      </div>
    </section>
  );
}
