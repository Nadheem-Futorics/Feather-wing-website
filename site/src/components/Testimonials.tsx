"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { testimonials } from "@/data/testimonials";
import { useLang, dict } from "@/lib/i18n";
import { usePrefersReducedMotion } from "@/lib/motion";
import OfferBox from "./OfferBox";
import styles from "./Testimonials.module.css";

export default function Testimonials() {
  const { t, dir } = useLang();
  const reduced = usePrefersReducedMotion();
  const [idx, setIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback(
    (n: number) => setIdx((i) => (i + n + testimonials.length) % testimonials.length),
    []
  );

  useEffect(() => {
    if (reduced) return;
    timer.current = setInterval(() => go(1), 7000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [go, reduced]);

  const tm = testimonials[idx];

  return (
    <section className={`section ${styles.root}`} aria-label={t(dict.testimonials.kicker)}>
      <div className="wrap">
        <p className="kicker">{t(dict.testimonials.kicker)}</p>
        <h2 className="section-title serif">{t(dict.testimonials.title)}</h2>
        <p className={styles.note}>{t(dict.testimonials.note)}</p>

        <div className={styles.layout}>
          <div className={styles.reviews}>
        <figure className={styles.card} aria-live="polite">
          <div className={styles.stars} aria-label={`${tm.rating} / 5`}>
            {"★★★★★".slice(0, tm.rating)}
            <span className={styles.starsDim}>{"★★★★★".slice(tm.rating)}</span>
          </div>
          <blockquote className={`serif ${styles.quote}`}>“{t(tm.quote)}”</blockquote>
          <figcaption className={styles.who}>
            <span className={styles.avatar} aria-hidden="true">
              {t(tm.name).charAt(0)}
            </span>
            <span>
              <strong>{t(tm.name)}</strong>
              <em>
                {t(tm.type)} · {t(tm.service)}
              </em>
            </span>
          </figcaption>
        </figure>

        <div className={styles.controls}>
          <button onClick={() => go(-1)} aria-label={t({ en: "Previous testimonial", ar: "الرأي السابق" })}>
            {dir === "rtl" ? "→" : "←"}
          </button>
          <div className={styles.dots}>
            {testimonials.map((x, i) => (
              <button
                key={x.id}
                className={i === idx ? styles.dotOn : styles.dot}
                onClick={() => setIdx(i)}
                aria-label={`${i + 1} / ${testimonials.length}`}
                aria-current={i === idx}
              />
            ))}
          </div>
          <button onClick={() => go(1)} aria-label={t({ en: "Next testimonial", ar: "الرأي التالي" })}>
            {dir === "rtl" ? "←" : "→"}
          </button>
        </div>
          </div>
          <OfferBox />
        </div>
      </div>
    </section>
  );
}
