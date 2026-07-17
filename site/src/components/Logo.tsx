"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

/**
 * Official Feather Wing Tours logo.
 * Drop the provided PNG at  /public/brand/logo.png  (full lock-up)
 * — it is used untouched, exactly as supplied.
 * Until the file exists, an accurate typographic lock-up in the
 * official palette is shown so the layout never breaks.
 */
export default function Logo({
  height = 44,
  stacked = false,
  className,
}: {
  height?: number;
  stacked?: boolean;
  className?: string;
}) {
  const [imgOk, setImgOk] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);
  const { t } = useLang();

  // the SSR-rendered <img> may 404 before hydration attaches onError
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setImgOk(false);
  }, []);

  if (imgOk) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        ref={imgRef}
        src="/brand/logo.png"
        alt="Feather Wing Tours"
        style={{ height, width: "auto" }}
        className={className}
        onError={() => setImgOk(false)}
      />
    );
  }

  // Typographic fallback — brand colors, no redesign of the mark.
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        lineHeight: 1,
        gap: stacked ? 6 : 3,
      }}
      aria-label={t({ en: "Feather Wing Tours", ar: "فذر وينغ تورز" })}
    >
      <span
        className="serif"
        style={{
          fontSize: stacked ? height * 0.52 : height * 0.42,
          letterSpacing: "0.06em",
          color: "var(--white)",
          whiteSpace: "nowrap",
          fontWeight: 600,
        }}
      >
        Feather Wing
      </span>
      <span
        style={{
          fontSize: stacked ? height * 0.24 : height * 0.2,
          letterSpacing: "0.55em",
          textTransform: "uppercase",
          color: "var(--gold)",
          whiteSpace: "nowrap",
          paddingInlineStart: "0.55em",
        }}
      >
        Tours
      </span>
    </span>
  );
}
