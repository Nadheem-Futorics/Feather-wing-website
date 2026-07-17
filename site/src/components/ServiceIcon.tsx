"use client";

import React from "react";

/** Subtle 3D-feel line icons in the brand gold, one per service. */
export default function ServiceIcon({ name, size = 46 }: { name: string; size?: number }) {
  const stroke = "url(#ic-gold)";
  const paths: Record<string, React.ReactNode> = {
    ticket: (
      <>
        <path d="M8 20 L34 12 L38 20 L14 30 Z" />
        <path d="M22 15.5 L26 23" strokeDasharray="2.5 3" />
        <path d="M10 34 H38" opacity="0.5" />
      </>
    ),
    passport: (
      <>
        <rect x="12" y="8" width="24" height="32" rx="3" />
        <circle cx="24" cy="20" r="6" />
        <path d="M18 32 H30" />
      </>
    ),
    car: (
      <>
        <path d="M8 28 L12 18 Q13 16 15 16 H31 Q33 16 34 18 L38 28" />
        <rect x="6" y="28" width="36" height="7" rx="3" />
        <circle cx="15" cy="37" r="3.4" />
        <circle cx="33" cy="37" r="3.4" />
      </>
    ),
    tent: (
      <>
        <path d="M24 10 L6 38 H42 Z" />
        <path d="M24 10 L24 38 M17 38 L24 24 L31 38" />
      </>
    ),
    bus: (
      <>
        <rect x="8" y="10" width="32" height="24" rx="4" />
        <path d="M8 22 H40 M16 10 V22 M24 10 V22 M32 10 V22" />
        <circle cx="16" cy="38" r="3.2" />
        <circle cx="32" cy="38" r="3.2" />
      </>
    ),
    kaaba: (
      <>
        <path d="M10 16 L24 8 L38 16 L38 36 L24 42 L10 36 Z" />
        <path d="M10 16 L24 22 L38 16 M24 22 V42" />
        <path d="M10 24 L24 30 L38 24" opacity="0.6" />
      </>
    ),
    mosque: (
      <>
        <path d="M14 38 V26 Q14 16 24 12 Q34 16 34 26 V38 Z" />
        <path d="M8 38 H40" />
        <path d="M24 12 V7 M22 7 H26" />
        <path d="M19 38 V30 Q19 26 24 26 Q29 26 29 30 V38" opacity="0.7" />
      </>
    ),
    lights: (
      <>
        <path d="M6 14 Q24 26 42 14" />
        <circle cx="14" cy="19" r="1.8" fill={stroke} />
        <circle cx="24" cy="22" r="1.8" fill={stroke} />
        <circle cx="34" cy="19" r="1.8" fill={stroke} />
        <path d="M10 40 H38 M12 40 L16 30 H32 L36 40" />
      </>
    ),
    stage: (
      <>
        <rect x="10" y="10" width="28" height="17" rx="2" />
        <path d="M24 27 V33 M14 40 Q24 32 34 40" />
        <path d="M16 16 H32 M16 21 H26" opacity="0.6" />
      </>
    ),
    hearts: (
      <>
        <path d="M24 40 C10 30 6 20 12 14 Q17 10 24 17 Q31 10 36 14 C42 20 38 30 24 40 Z" />
        <path d="M17 22 Q24 28 31 22" opacity="0.6" />
      </>
    ),
  };

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" strokeWidth="1.7" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <defs>
        <linearGradient id="ic-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f7cb6c" />
          <stop offset="100%" stopColor="#e5a52e" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22.5" stroke="rgba(247,203,108,0.35)" strokeWidth="1" />
      {paths[name] ?? paths.ticket}
    </svg>
  );
}
