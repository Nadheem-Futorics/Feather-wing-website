"use client";

import React, { useEffect, useImperativeHandle, useRef, forwardRef, useState } from "react";
import { clipPaths } from "@/data/clips";
import { gsap, useIsMobile, usePrefersReducedMotion } from "@/lib/motion";

export interface ScrubVideoHandle {
  /** map scroll progress [0,1] → video timeline */
  setProgress: (p: number) => void;
  /** attach/detach sources (progressive loading) */
  activate: () => void;
}

/**
 * Scroll-scrubbed Seedance clip. The video NEVER autoplays — it is
 * paused permanently and its currentTime is driven by scroll progress
 * (smoothed via gsap ticker). Sources attach lazily on approach.
 * Keyframe-dense encodes (g=6) keep reverse seeking clean.
 */
const ScrubVideo = forwardRef<ScrubVideoHandle, { base: string; className?: string; label?: string }>(
  function ScrubVideo({ base, className, label }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [active, setActive] = useState(false);
    const target = useRef(0);
    const seekRef = useRef<() => void>(() => {});
    const mobile = useIsMobile();
    const reduced = usePrefersReducedMotion();
    const paths = clipPaths(base);

    useImperativeHandle(ref, () => ({
      setProgress: (p: number) => {
        target.current = Math.max(0, Math.min(1, p));
        seekRef.current(); // nudge directly — rAF can be throttled to zero
      },
      activate: () => setActive(true),
    }));

    useEffect(() => {
      if (!active || reduced) return;
      const v = videoRef.current;
      if (!v) return;
      v.pause(); // scroll owns the timeline

      let dur = 0;
      const onMeta = () => {
        dur = v.duration || 0;
      };
      v.addEventListener("loadedmetadata", onMeta);
      if (v.readyState >= 1) onMeta();

      const tick = () => {
        if (!dur || v.seeking) return;
        const want = target.current * Math.max(0, dur - 0.05);
        const diff = want - v.currentTime;
        if (Math.abs(diff) > 0.02) {
          // lerp toward the target for smooth scrubbing; snap on big jumps
          v.currentTime = Math.abs(diff) > 1.2 ? want : v.currentTime + diff * 0.3;
        }
      };
      seekRef.current = tick;
      gsap.ticker.add(tick);
      const iv = setInterval(tick, 180); // throttled-pane fallback
      return () => {
        gsap.ticker.remove(tick);
        clearInterval(iv);
        seekRef.current = () => {};
        v.removeEventListener("loadedmetadata", onMeta);
      };
    }, [active, reduced]);

    if (reduced || !active) {
      // poster until activated (or permanently under reduced motion)
      return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={paths.poster} alt={label ?? ""} className={className} loading="lazy" decoding="async" />
      );
    }

    return (
      <video
        key={mobile ? "m" : "d"} // remount when the breakpoint flips so sources re-resolve
        ref={videoRef}
        className={className}
        muted
        playsInline
        preload="auto"
        poster={paths.poster}
        aria-label={label}
        disablePictureInPicture
      >
        {!mobile && <source src={paths.webm} type="video/webm" />}
        <source src={mobile ? paths.mobile : paths.mp4} type="video/mp4" />
      </video>
    );
  }
);

export default ScrubVideo;
