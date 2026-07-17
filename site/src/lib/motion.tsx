"use client";

import { useEffect, useState, createContext, useContext, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    queueMicrotask(() => setReduced(mq.matches));
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function useIsMobile(breakpoint = 820): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    queueMicrotask(() => setMobile(mq.matches));
    const on = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [breakpoint]);
  return mobile;
}

const SmoothScrollCtx = createContext<{ lenis: Lenis | null }>({ lenis: null });

/**
 * Scroll-position–driven "in view" helper (rAF-throttled).
 * Listens to native scroll, Lenis's virtual scroll emitter, and a light
 * interval fallback — IntersectionObserver and even native scroll events
 * are inert in some embedded webviews.
 */
export function useScrollWatcher(fn: () => void, deps: React.DependencyList = []) {
  const { lenis } = useContext(SmoothScrollCtx);
  useEffect(() => {
    let last = 0;
    // time-throttled, not rAF-gated: rAF never fires in throttled/hidden
    // panes, which would silence updates entirely.
    const onScroll = () => {
      const now = performance.now();
      if (now - last < 40) return;
      last = now;
      fn();
    };
    fn();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    lenis?.on("scroll", onScroll);
    const iv = setInterval(fn, 400);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      lenis?.off("scroll", onScroll);
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, lenis]);
}
export const useSmoothScroll = () => useContext(SmoothScrollCtx);

/** Lenis smooth scrolling wired into GSAP ScrollTrigger. */
export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return; // native scrolling for reduced motion
    const instance = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = instance;
    queueMicrotask(() => setLenis(instance));
    // expose for debugging / e2e checks
    (window as unknown as { __lenis?: Lenis }).__lenis = instance;

    instance.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      instance.destroy();
      lenisRef.current = null;
      setLenis(null);
    };
  }, [reduced]);

  return <SmoothScrollCtx.Provider value={{ lenis }}>{children}</SmoothScrollCtx.Provider>;
}

export { gsap, ScrollTrigger };
