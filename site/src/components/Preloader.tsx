"use client";

import React, { useEffect, useState } from "react";
import Logo from "./Logo";
import { useLang, dict } from "@/lib/i18n";
import { frameStore } from "@/lib/frameStore";
import { HERO_BOOT_SCENES } from "./HeroJourney";
import { usePrefersReducedMotion } from "@/lib/motion";
import styles from "./Preloader.module.css";

/**
 * Branded loading screen with REAL progress: it reports the frame
 * count of the first two hero sequences as they load, reveals the
 * site once the opening sequence is scrubbable, and lets background
 * preloading continue. Hard failsafe at 12s so the site is never
 * blocked by missing media.
 */
export default function Preloader() {
  const [pct, setPct] = useState(0);
  const [gone, setGone] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { t } = useLang();
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setPct(100);
      setGone(true);
      setTimeout(() => setHidden(true), 800);
    };

    if (reduced) {
      // reduced motion shows posters — no frame preloading needed
      finish();
      return;
    }

    const iv = setInterval(() => {
      const { loaded, total } = frameStore.progressOf(HERO_BOOT_SCENES);
      if (total === 0) return; // hero not mounted yet
      const p = Math.round((loaded / total) * 100);
      setPct(p);
      // reveal once the opening scene is fully scrubbable and the
      // second is well underway
      const first = frameStore.progressOf([HERO_BOOT_SCENES[0]]);
      if (first.total > 0 && first.loaded >= first.total && p >= 70) finish();
    }, 120);

    const failsafe = setTimeout(finish, 12000);
    return () => {
      clearInterval(iv);
      clearTimeout(failsafe);
    };
  }, [reduced]);

  if (hidden) return null;

  return (
    <div className={`${styles.root} ${gone ? styles.gone : ""}`} aria-hidden={gone}>
      <div className={styles.center}>
        <Logo height={92} stacked />
        <div className={styles.bar} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: `${Math.max(4, pct)}%`, animation: "none" }} />
        </div>
        <p>
          {t(dict.hero.loading)} {pct > 0 ? `${pct}%` : ""}
        </p>
      </div>
    </div>
  );
}
