"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import { services } from "@/data/services";
import { serviceClips } from "@/data/clips";
import { useLang, dict } from "@/lib/i18n";
import { gsap, ScrollTrigger, usePrefersReducedMotion, useIsMobile, useScrollWatcher } from "@/lib/motion";
import ScrubVideo, { ScrubVideoHandle } from "./ScrubVideo";
import ServiceIcon from "./ServiceIcon";
import styles from "./Services.module.css";

export default function Services() {
  const { t } = useLang();
  const reduced = usePrefersReducedMotion();
  const mobile = useIsMobile();
  const rootRef = useRef<HTMLElement>(null);
  const scrubRefs = useRef<Record<string, ScrubVideoHandle | null>>({});
  const [activeId, setActiveId] = useState(services[0].id);
  const [navVisible, setNavVisible] = useState(false);

  // scroll-spy for the floating navigator + progressive clip activation
  useScrollWatcher(() => {
    const mid = window.innerHeight / 2;
    for (const s of services) {
      const el = document.getElementById(`svc-${s.id}`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) setActiveId(s.id);
      // attach video sources when the chapter approaches (within 2 viewports)
      if (r.top < window.innerHeight * 2 && r.bottom > -window.innerHeight) {
        scrubRefs.current[s.id]?.activate();
      }
    }
    const root = rootRef.current;
    if (root) {
      const r = root.getBoundingClientRect();
      setNavVisible(r.top < window.innerHeight * 0.7 && r.bottom > window.innerHeight * 0.5);
    }
  });

  // pinned scroll-scrub per chapter: scroll progress drives video time,
  // text reveals sit on the same scrubbed timeline
  useLayoutEffect(() => {
    if (reduced) return;
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-chapter]", root).forEach((chapter) => {
        const id = chapter.dataset.chapter!;
        const panel = chapter.querySelector("[data-svc-panel]");
        const cta = chapter.querySelector("[data-svc-cta]");

        const tl = gsap.timeline({ defaults: { ease: "none" } });
        if (panel) {
          tl.fromTo(panel, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.2, ease: "power2.out" }, 0.42);
        }
        if (cta) {
          // CTA settles into place across the final 20% of the chapter
          tl.fromTo(cta, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.14, ease: "power2.out" }, 0.8);
        }

        ScrollTrigger.create({
          trigger: chapter,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.4,
          animation: tl,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            scrubRefs.current[id]?.setProgress(self.progress);
          },
        });
      });
    }, root);
    return () => ctx.revert();
  }, [reduced, mobile]);

  return (
    <section id="services" ref={rootRef} className={styles.root} aria-label={t(dict.services.kicker)}>
      <div className={`wrap ${styles.head}`}>
        <p className="kicker">{t(dict.services.kicker)}</p>
        <h2 className="section-title serif">{t(dict.services.title)}</h2>
        <hr className="gold-rule" style={{ marginTop: "1.4rem" }} />
      </div>

      {services.map((s, i) => (
        <article
          key={s.id}
          id={`svc-${s.id}`}
          data-chapter={s.id}
          className={`${styles.chapter} ${i % 2 ? styles.alt : ""} ${reduced ? styles.chapterStatic : ""}`}
        >
          <div className={styles.sticky}>
            <div className={styles.media}>
              <ScrubVideo
                ref={(h) => {
                  scrubRefs.current[s.id] = h;
                }}
                base={serviceClips[s.id]}
                className={styles.video}
                label={t(s.title)}
              />
              <div className="vignette" />
            </div>

            <div className={`${styles.panel} glass`} data-svc-panel>
              <div className={styles.panelHead}>
                <ServiceIcon name={s.icon} />
                <span className={styles.num}>{s.num}</span>
              </div>
              <h3 className={`serif ${styles.title}`}>{t(s.title)}</h3>
              <p className={styles.copy}>{t(s.copy)}</p>
              <p className={styles.highlight}>{t(s.highlight)}</p>
              <div data-svc-cta>
                <a href="#enquiry" className="btn btn-gold" data-cursor="book" data-service={s.id}>
                  {t(s.cta)}
                </a>
              </div>
            </div>
          </div>
        </article>
      ))}

      {/* floating service navigator */}
      <nav
        className={`${styles.navigator} ${navVisible ? styles.navOn : ""}`}
        aria-label={t({ en: "Service navigator", ar: "متصفح الخدمات" })}
      >
        <ul>
          {services.map((s) => (
            <li key={s.id}>
              <a
                href={`#svc-${s.id}`}
                className={activeId === s.id ? styles.navActive : ""}
                aria-current={activeId === s.id ? "true" : undefined}
              >
                <span className={styles.navNum}>{s.num}</span>
                <span className={styles.navLabel}>{t(s.short)}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
