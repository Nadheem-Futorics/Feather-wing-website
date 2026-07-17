"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLang, dict } from "@/lib/i18n";

/**
 * Minimal gold circular cursor, desktop pointer devices only
 * (CSS hides it elsewhere). Shows short labels over elements
 * carrying data-cursor="explore|viewTrip|book|discover".
 */
export default function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string | null>(null);
  const { t } = useLang();

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const el = ref.current;
    if (!el) return;

    let x = -100, y = -100, cx = -100, cy = -100, raf = 0;

    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      const target = (e.target as HTMLElement).closest?.("[data-cursor]") as HTMLElement | null;
      setLabel(target?.dataset.cursor ?? null);
    };

    const loop = () => {
      cx += (x - cx) * 0.22;
      cy += (y - cy) * 0.22;
      el.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const labels: Record<string, string> = {
    explore: t(dict.cursor.explore),
    viewTrip: t(dict.cursor.viewTrip),
    book: t(dict.cursor.book),
    discover: t(dict.cursor.discover),
  };

  return (
    <div ref={ref} className={`fwt-cursor ${label ? "is-label" : ""}`} aria-hidden="true">
      <span>{label ? labels[label] ?? "" : ""}</span>
    </div>
  );
}
