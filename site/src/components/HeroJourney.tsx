"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { gsap, ScrollTrigger, usePrefersReducedMotion, useIsMobile } from "@/lib/motion";
import { useLang, dict } from "@/lib/i18n";
import { saudiDestinations, internationalDestinations, Destination } from "@/data/destinations";
import { heroClips, clipPaths } from "@/data/clips";
import { frameStore } from "@/lib/frameStore";
import manifest from "@/data/media.generated.json";
import Logo from "./Logo";
import styles from "./HeroJourney.module.css";

type Manifest = Record<string, { frames?: number; mp4?: boolean; webm?: boolean; mobile?: boolean }>;
const media = manifest as Manifest;

type SceneDef =
  | { kind: "logo"; id: "seq-logo" }
  | { kind: "transform"; id: "seq-transform" }
  | { kind: "flight"; id: "seq-flight" }
  | { kind: "divider"; id: "seq-divider" }
  | { kind: "finale"; id: "finale" }
  | { kind: "dest"; id: string; dest: Destination; index: number; chapter: "sa" | "intl" };

function buildScenes(): SceneDef[] {
  const s: SceneDef[] = [
    { kind: "logo", id: "seq-logo" },
    { kind: "transform", id: "seq-transform" },
  ];
  saudiDestinations.forEach((dest, i) => s.push({ kind: "dest", id: dest.id, dest, index: i + 1, chapter: "sa" }));
  s.push({ kind: "divider", id: "seq-divider" });
  internationalDestinations.forEach((dest, i) => s.push({ kind: "dest", id: dest.id, dest, index: i + 1, chapter: "intl" }));
  s.push({ kind: "finale", id: "finale" });
  return s;
}

/** first scenes — the branded loader waits on these */
export const HERO_BOOT_SCENES = ["FW_HERO_01_LogoReveal", "FW_HERO_02_LogoTransform"];

export default function HeroJourney() {
  const { t } = useLang();
  const reduced = usePrefersReducedMotion();
  const mobile = useIsMobile();
  const outerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const scenes = useMemo(() => buildScenes(), []);
  const bases = useMemo(() => scenes.map((s) => heroClips[s.id]), [scenes]);

  const perScene = mobile ? 58 : 74; // vh of scroll per scene
  const totalVh = 100 + scenes.length * perScene;

  // ── canvas frame-scrub engine ─────────────────────────────────
  useLayoutEffect(() => {
    if (reduced) return;
    const outer = outerRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!outer || !stage || !canvas) return;
    const ctx2d = canvas.getContext("2d", { alpha: false });
    if (!ctx2d) return;

    const N = scenes.length;
    const posterCache = new Map<string, HTMLImageElement>();

    // register every scene's frame set (or poster fallback)
    bases.forEach((base) => {
      const count = media[base]?.frames ?? 0;
      if (count > 0) frameStore.register(base, count);
      else if (!posterCache.has(base)) {
        const img = new Image();
        img.src = clipPaths(base).poster;
        posterCache.set(base, img);
      }
    });

    // boot: load the first two scenes immediately
    frameStore.load(bases[0], () => (needsDraw = true));
    frameStore.load(bases[1], () => (needsDraw = true));

    let target = 0; // timeline progress in scene units [0, N]
    let current = 0;
    let lastSceneIdx = -1;
    let needsDraw = true;

    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
    const resize = () => {
      canvas.width = Math.round(stage.clientWidth * dpr);
      canvas.height = Math.round(stage.clientHeight * dpr);
      needsDraw = true;
    };
    resize();
    window.addEventListener("resize", resize);

    const posterFor = (base: string): HTMLImageElement | null => {
      let poster = posterCache.get(base);
      if (!poster) {
        poster = new Image();
        poster.onload = () => (needsDraw = true);
        poster.src = clipPaths(base).poster;
        posterCache.set(base, poster);
      }
      return poster.complete && poster.naturalWidth > 0 ? poster : null;
    };

    const imageFor = (sceneIdx: number, localP: number): CanvasImageSource | null => {
      const base = bases[sceneIdx];
      const s = frameStore.get(base);
      if (s && s.count > 0) {
        const idx = Math.round(localP * (s.count - 1));
        const frame = frameStore.frameAt(base, idx);
        if (frame) return frame;
      }
      // loading fallback: the clip's poster frame until footage streams in
      return posterFor(base);
    };

    const drawCover = (img: CanvasImageSource, alpha: number) => {
      const iw = (img as HTMLImageElement).naturalWidth || (img as HTMLImageElement).width;
      const ih = (img as HTMLImageElement).naturalHeight || (img as HTMLImageElement).height;
      if (!iw || !ih) return;
      const cw = canvas.width;
      const ch = canvas.height;
      const scale = Math.max(cw / iw, ch / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      ctx2d.globalAlpha = alpha;
      ctx2d.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      ctx2d.globalAlpha = 1;
    };

    const XFADE = 0.16; // final fraction of a scene that crossfades into the next

    const draw = () => {
      const p = Math.max(0, Math.min(N - 0.0001, current));
      const i = Math.floor(p);
      const localP = p - i;

      // sliding load window + eviction
      if (i !== lastSceneIdx) {
        lastSceneIdx = i;
        const keep = new Set<string>();
        for (const k of [i - 1, i, i + 1, i + 2]) {
          if (k >= 0 && k < N) keep.add(bases[k]);
        }
        frameStore.evictExcept(keep);
        frameStore.load(bases[i], () => (needsDraw = true));
        if (i + 1 < N) frameStore.load(bases[i + 1], () => (needsDraw = true));
        if (localP > 0.5 && i + 2 < N) frameStore.load(bases[i + 2]);
      }

      ctx2d.fillStyle = "#030611";
      ctx2d.fillRect(0, 0, canvas.width, canvas.height);

      const scrubP = Math.min(1, localP / (1 - XFADE)); // full clip plays before the crossfade window ends
      const img = imageFor(i, scrubP);
      if (img) drawCover(img, 1);

      // crossfade into the next scene near the boundary
      if (localP > 1 - XFADE && i + 1 < N && bases[i + 1] !== bases[i]) {
        const a = (localP - (1 - XFADE)) / XFADE;
        const nextImg = imageFor(i + 1, 0);
        if (nextImg) drawCover(nextImg, a * a);
      }
    };

    const tick = () => {
      const diff = target - current;
      if (Math.abs(diff) > 2.5) {
        // long jump (anchor link / fast fling): snap instead of replaying
        current = target;
        needsDraw = true;
      } else if (Math.abs(diff) > 0.0004) {
        current += diff * 0.18;
        needsDraw = true;
      } else if (current !== target) {
        current = target;
        needsDraw = true;
      }
      if (needsDraw) {
        needsDraw = false;
        draw();
      }
    };
    gsap.ticker.add(tick);
    // rAF (and therefore gsap.ticker) can be throttled to zero in hidden or
    // embedded panes — keep the canvas honest with an interval fallback and
    // a direct nudge from every ScrollTrigger update.
    const tickIv = setInterval(tick, 150);

    // ── captions timeline, scrubbed by the same trigger ──────────
    const ctx = gsap.context(() => {
      const captions = gsap.utils.toArray<HTMLElement>("[data-caption]", stage);
      const tl = gsap.timeline({ defaults: { ease: "none" } });

      captions.forEach((cap, i) => {
        const isFirst = i === 0;
        const isLast = i === captions.length - 1;
        gsap.set(cap, { autoAlpha: isFirst ? 1 : 0, y: isFirst ? 0 : 46 });
        if (!isFirst) {
          tl.fromTo(
            cap,
            { autoAlpha: 0, y: 46, letterSpacing: "0.12em" },
            { autoAlpha: 1, y: 0, letterSpacing: "0.01em", duration: 0.3, ease: "power2.out" },
            i + 0.16
          );
        }
        if (!isLast) {
          tl.to(cap, { autoAlpha: 0, y: -30, duration: 0.2, ease: "power1.in" }, i + 0.78);
        }
      });

      if (progressRef.current) {
        tl.fromTo(progressRef.current, { scaleY: 0 }, { scaleY: 1, duration: captions.length, ease: "none" }, 0);
      }

      ScrollTrigger.create({
        trigger: outer,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.4,
        animation: tl,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          target = self.progress * N;
          tick();
        },
      });
    }, outer);

    return () => {
      gsap.ticker.remove(tick);
      clearInterval(tickIv);
      window.removeEventListener("resize", resize);
      ctx.revert();
    };
  }, [reduced, mobile, scenes, bases]);

  // reduced-motion fallback loads nothing heavy
  useEffect(() => {
    if (!reduced) return;
  }, [reduced]);

  // ── reduced motion: poster frames, full content preserved ─────
  if (reduced) {
    return (
      <section id="home" aria-label={t({ en: "Feather Wing Tours journey", ar: "رحلة فذر وينغ تورز" })}>
        {scenes.map((s, i) => (
          <div key={s.id} className={styles.staticScene} id={i === 2 ? "destinations" : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={clipPaths(heroClips[s.id]).poster}
              alt=""
              className="scene-fill"
              loading={i < 2 ? "eager" : "lazy"}
            />
            <div className="vignette" />
            <SceneCaption s={s} />
          </div>
        ))}
      </section>
    );
  }

  return (
    <section
      id="home"
      ref={outerRef}
      className={styles.outer}
      style={{ height: `${totalVh}vh` }}
      aria-label={t({ en: "Feather Wing Tours journey", ar: "رحلة فذر وينغ تورز" })}
    >
      {/* anchor target for the Destinations nav link (≈ start of the Saudi journey) */}
      <div id="destinations" style={{ position: "absolute", top: "12%" }} aria-hidden="true" />

      {/* Screen-reader narrative of the visual journey */}
      <div className="sr-only">
        <h1>Feather Wing Tours — {t(dict.hero.tagline)}</h1>
        <p>{t(dict.hero.beginWing)}</p>
        <ul>
          {[...saudiDestinations, ...internationalDestinations].map((d) => (
            <li key={d.id}>
              {t(d.title)} — {t(d.line)}
            </li>
          ))}
        </ul>
        <p>
          {t(dict.hero.oneWing)} {t(dict.hero.endless)}
        </p>
      </div>

      <div className={styles.stage} ref={stageRef}>
        {/* the cinematic timeline — every frame comes from Seedance 2.0 footage */}
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />

        {scenes.map((s) => (
          <SceneCaption key={s.id} s={s} />
        ))}

        {/* progress rail */}
        <div className={styles.rail}>
          <div ref={progressRef} className={styles.railFill} />
        </div>

        {/* scroll hint */}
        <div className={styles.scrollHint}>
          <span>{t(dict.hero.scroll)}</span>
          <i className={styles.scrollLine} />
        </div>
      </div>
    </section>
  );
}

/* ── HTML text layers (kept out of the footage by design) ─────── */

function SceneCaption({ s }: { s: SceneDef }) {
  const { t } = useLang();

  if (s.kind === "logo") {
    return (
      <div data-caption className={styles.centerCaption}>
        <Logo height={150} stacked className={styles.heroLogo} />
        <hr className="gold-rule" style={{ marginInline: "auto", marginTop: "1.6rem" }} />
        <p className={`serif ${styles.tagline}`}>{t(dict.hero.tagline)}</p>
      </div>
    );
  }

  if (s.kind === "transform") {
    return (
      <div data-caption className={styles.lowCaption}>
        <p className={`serif ${styles.poetic}`}>{t(dict.hero.beginWing)}</p>
      </div>
    );
  }

  if (s.kind === "flight") {
    return (
      <div data-caption className={styles.lowCaption}>
        <p className={`serif ${styles.poetic}`}>
          {dict.hero.flight.map((l, i) => (
            <span key={i} className={styles.flightLine}>
              {t(l)}
            </span>
          ))}
        </p>
      </div>
    );
  }

  if (s.kind === "divider") {
    return (
      <div data-caption className={styles.centerCaption}>
        <hr className="gold-rule" style={{ marginInline: "auto" }} />
        <p className={styles.dividerText}>{t(dict.hero.beyondBorders)}</p>
        <hr className="gold-rule" style={{ marginInline: "auto" }} />
      </div>
    );
  }

  if (s.kind === "finale") {
    return (
      <div data-caption className={styles.finale}>
        <h2 className={`serif ${styles.finaleTitle}`}>
          <span>{t(dict.hero.oneWing)}</span>
          <span className={styles.goldText}>{t(dict.hero.endless)}</span>
        </h2>
        <p className={styles.finaleTag}>{t(dict.hero.tagline)}</p>
        <div className={styles.ctaRow}>
          <a href="#services" className="btn btn-gold" data-cursor="explore">
            {t(dict.hero.exploreServices)}
          </a>
          <a href="#enquiry" className="btn btn-ghost" data-cursor="book">
            {t(dict.hero.planJourney)}
          </a>
        </div>
      </div>
    );
  }

  const { dest, index, chapter } = s;
  return (
    <div data-caption className={styles.destCaption}>
      <span className={styles.destIndex}>
        {chapter === "sa" ? "SA" : "INT"} · {String(index).padStart(2, "0")}
      </span>
      <h2 className={`serif ${styles.destTitle}`}>{t(dest.title)}</h2>
      <hr className="gold-rule" />
      <p className={styles.destLine}>{t(dest.line)}</p>
    </div>
  );
}
