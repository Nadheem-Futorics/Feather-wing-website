"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLang, dict } from "@/lib/i18n";
import { usePrefersReducedMotion, useIsMobile, useScrollWatcher } from "@/lib/motion";
import { clipPaths } from "@/data/clips";
import Logo from "./Logo";
import styles from "./FinalCTA.module.css";

const FINALE = "FW_HERO_31_GoldenHorizon";

export default function FinalCTA() {
  const { t } = useLang();
  const reduced = usePrefersReducedMotion();
  const mobile = useIsMobile();
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const paths = clipPaths(FINALE);

  // the closing bird flies in a slow ambient loop — paused off-screen
  useScrollWatcher(() => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setInView(r.top < window.innerHeight * 1.5 && r.bottom > -window.innerHeight * 0.5);
  });

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (inView && !reduced) v.play().catch(() => {});
    else v.pause();
  }, [inView, reduced]);

  return (
    <section id="contact" ref={rootRef} className={styles.root} aria-label={t(dict.hero.oneWing)}>
      <div className={styles.bg} aria-hidden="true">
        {reduced ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={paths.poster} alt="" className={styles.video} loading="lazy" />
        ) : (
          <video
            ref={videoRef}
            className={styles.video}
            muted
            loop
            playsInline
            preload="none"
            poster={paths.poster}
            disablePictureInPicture
          >
            {!mobile && <source src={paths.webm} type="video/webm" />}
            <source src={mobile ? paths.mobile : paths.mp4} type="video/mp4" />
          </video>
        )}
        <div className="vignette" />
      </div>

      <div className={`wrap ${styles.inner}`}>
        <div className={styles.left}>
          <Logo height={120} stacked className={styles.logo} />
        </div>
        <div className={styles.right}>
          <h2 className={`serif ${styles.title}`}>
            <span>{t(dict.hero.oneWing)}</span>
            <span className={styles.gold}>{t(dict.hero.endless)}</span>
          </h2>
          <p className={styles.tag}>{t(dict.hero.tagline)}</p>
          <div className={styles.ctas}>
            <a href="#enquiry" className="btn btn-gold" data-cursor="book">
              {t(dict.finalCta.start)}
            </a>
            <a href="#enquiry" className="btn btn-ghost" data-cursor="discover">
              {t(dict.finalCta.contact)}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
