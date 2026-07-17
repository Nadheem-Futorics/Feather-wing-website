"use client";

import React, { useId } from "react";
import type { SceneKind } from "@/data/destinations";
import type { ServiceScene } from "@/data/services";

type Hue = "gold" | "sand" | "aqua" | "navy" | "green" | "violet" | "rose";
export type AnyScene = SceneKind | ServiceScene;

const palettes: Record<Hue, { sky: [string, string, string]; glow: string; land: string; land2: string }> = {
  gold:   { sky: ["#030611", "#2a1a4d", "#8a5a1e"], glow: "#f7cb6c", land: "#120a26", land2: "#1d1238" },
  sand:   { sky: ["#050814", "#3a2560", "#a86a28"], glow: "#e5a52e", land: "#170e2c", land2: "#241542" },
  aqua:   { sky: ["#030611", "#0d2a52", "#2e7fa8"], glow: "#f7cb6c", land: "#06263a", land2: "#0a4a66" },
  navy:   { sky: ["#030611", "#09122d", "#1a2b5e"], glow: "#7355d8", land: "#060a1c", land2: "#0d1530" },
  green:  { sky: ["#04101a", "#12324a", "#3f7a6a"], glow: "#f7cb6c", land: "#0a1f22", land2: "#123230" },
  violet: { sky: ["#030611", "#241a54", "#4b3194"], glow: "#e5a52e", land: "#0c0a24", land2: "#171040" },
  rose:   { sky: ["#0d0715", "#4a2350", "#a05a3e"], glow: "#f7cb6c", land: "#150a20", land2: "#221136" },
};

/**
 * Deterministic pseudo-random from an index. Quantized to 4 decimals so
 * server and client render byte-identical attribute values (raw float
 * tails differ across engines → hydration mismatch).
 */
const rnd = (i: number, salt = 1) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return Math.round((x - Math.floor(x)) * 10000) / 10000;
};

function Stars({ count = 60, seed = 1 }: { count?: number; seed?: number }) {
  return (
    <g opacity={0.8}>
      {Array.from({ length: count }, (_, i) => (
        <circle
          key={i}
          cx={rnd(i, seed) * 1600}
          cy={rnd(i, seed + 9) * 420}
          r={rnd(i, seed + 3) * 1.4 + 0.3}
          fill="#f5f1e8"
          opacity={0.25 + rnd(i, seed + 5) * 0.5}
        />
      ))}
    </g>
  );
}

function Particles({ color, count = 26, seed = 4 }: { color: string; count?: number; seed?: number }) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <circle
          key={i}
          cx={rnd(i, seed) * 1600}
          cy={260 + rnd(i, seed + 2) * 560}
          r={rnd(i, seed + 6) * 2.4 + 0.6}
          fill={color}
          opacity={0.12 + rnd(i, seed + 8) * 0.28}
        />
      ))}
    </g>
  );
}

function Silhouette({ scene, p }: { scene: AnyScene; p: (typeof palettes)[Hue] }) {
  switch (scene) {
    case "canyon":
      return (
        <g>
          <path d="M0,900 L0,240 Q80,260 130,210 L200,300 Q260,280 300,360 L370,420 Q420,520 460,620 L470,900 Z" fill={p.land} />
          <path d="M1600,900 L1600,200 Q1520,240 1460,190 L1400,300 Q1340,290 1300,380 L1230,460 Q1180,560 1150,660 L1140,900 Z" fill={p.land} />
          <path d="M0,900 L0,560 Q200,540 380,600 Q520,650 640,700 L700,900 Z" fill={p.land2} opacity={0.85} />
          <path d="M1600,900 L1600,540 Q1420,560 1240,620 Q1080,670 960,720 L920,900 Z" fill={p.land2} opacity={0.85} />
        </g>
      );
    case "hegra":
      return (
        <g>
          <path d="M540,900 L540,340 Q560,300 620,290 L660,250 L1000,250 L1040,290 Q1090,300 1110,340 L1110,900 Z" fill={p.land} />
          <rect x="740" y="470" width="170" height="430" rx="8" fill={p.land2} />
          <path d="M700,470 L825,380 L950,470 Z" fill={p.land2} />
          <path d="M0,900 L0,660 Q220,620 420,680 L520,900 Z" fill={p.land2} opacity={0.8} />
          <path d="M1600,900 L1600,640 Q1400,620 1220,690 L1160,900 Z" fill={p.land2} opacity={0.8} />
        </g>
      );
    case "island":
    case "maldives":
      return (
        <g>
          <rect x="0" y="580" width="1600" height="320" fill={p.land2} opacity={0.9} />
          <path d="M120,580 Q300,500 480,580 Z" fill={p.land} />
          <path d="M1080,580 Q1240,516 1420,580 Z" fill={p.land} />
          {scene === "maldives" && (
            <g fill={p.land}>
              <rect x="600" y="540" width="60" height="34" rx="6" />
              <rect x="700" y="548" width="60" height="30" rx="6" />
              <rect x="800" y="540" width="60" height="34" rx="6" />
              <path d="M628,540 L628,586 M728,548 L728,586 M828,540 L828,586" stroke={p.land} strokeWidth="6" />
              <path d="M470,560 Q500,480 540,470 Q516,500 512,540 Q540,500 580,496 Q540,520 528,556 Z" />
            </g>
          )}
          <path d="M0,760 Q400,740 800,760 T1600,760 L1600,900 L0,900 Z" fill={p.land} opacity={0.7} />
        </g>
      );
    case "sea":
      return (
        <g>
          <rect x="0" y="560" width="1600" height="340" fill={p.land2} opacity={0.95} />
          <path d="M740,560 L860,560 L830,900 L770,900 Z" fill={p.glow} opacity={0.18} />
          <g stroke={p.glow} strokeWidth="2" opacity={0.35}>
            <path d="M300,640 h120 M520,700 h90 M1100,660 h140 M1300,730 h100 M700,780 h160" />
          </g>
          <path d="M0,620 Q160,600 300,622 Z" fill={p.land} opacity={0.8} />
          <path d="M1350,610 Q1470,590 1600,615 L1600,640 L1350,634 Z" fill={p.land} opacity={0.8} />
        </g>
      );
    case "heritage":
      return (
        <g fill={p.land}>
          <path d="M0,900 L0,600 L90,600 L90,560 L110,560 L110,600 L240,600 L240,540 L262,540 L262,600 L400,600 L400,900 Z" />
          <path d="M420,900 L420,560 L446,560 L446,520 L470,520 L470,560 L620,560 L620,500 L648,500 L648,560 L800,560 L800,900 Z" fill={p.land2} />
          <path d="M820,900 L820,590 L980,590 L980,540 L1010,540 L1010,590 L1160,590 L1160,900 Z" />
          <path d="M1180,900 L1180,570 L1330,570 L1330,520 L1360,520 L1360,570 L1600,570 L1600,900 Z" fill={p.land2} />
          <g fill={p.glow} opacity={0.5}>
            <rect x="140" y="660" width="16" height="24" rx="3" />
            <rect x="500" y="620" width="16" height="24" rx="3" />
            <rect x="880" y="650" width="16" height="24" rx="3" />
            <rect x="1250" y="630" width="16" height="24" rx="3" />
          </g>
        </g>
      );
    case "skyline":
      return (
        <g fill={p.land}>
          <path d="M700,900 L700,330 L760,270 L820,330 L820,900 Z" />
          <path d="M745,270 L775,270 L760,210 Z" />
          <rect x="520" y="470" width="120" height="430" />
          <path d="M520,470 L640,470 L610,430 L550,430 Z" />
          <rect x="900" y="430" width="90" height="470" fill={p.land2} />
          <rect x="1030" y="520" width="130" height="380" />
          <rect x="330" y="560" width="140" height="340" fill={p.land2} />
          <rect x="1220" y="580" width="110" height="320" fill={p.land2} />
          <rect x="120" y="640" width="160" height="260" />
          <rect x="1400" y="640" width="140" height="260" />
          <g fill={p.glow} opacity={0.45}>
            {Array.from({ length: 30 }, (_, i) => (
              <rect key={i} x={140 + rnd(i, 2) * 1320} y={480 + rnd(i, 7) * 360} width="8" height="12" rx="2" />
            ))}
          </g>
        </g>
      );
    case "coast-city":
    case "modern-coast":
      return (
        <g>
          <rect x="0" y="640" width="1600" height="260" fill={p.land2} opacity={0.9} />
          <g fill={p.land}>
            <rect x="180" y="420" width="90" height="220" />
            <rect x="300" y="360" width="70" height="280" />
            <path d="M420,640 L420,380 Q455,330 490,380 L490,640 Z" />
            <rect x="540" y="450" width="110" height="190" />
            <rect x="1000" y="400" width="80" height="240" />
            <path d="M1120,640 L1120,340 L1160,300 L1200,340 L1200,640 Z" />
            <rect x="1250" y="470" width="120" height="170" />
          </g>
          <path d="M760,640 L840,640 L820,900 L780,900 Z" fill={p.glow} opacity={0.16} />
          <g fill={p.glow} opacity={0.4}>
            {Array.from({ length: 18 }, (_, i) => (
              <rect key={i} x={200 + rnd(i, 3) * 1180} y={400 + rnd(i, 5) * 200} width="7" height="10" rx="2" />
            ))}
          </g>
        </g>
      );
    case "mountains":
    case "switzerland":
      return (
        <g>
          <path d="M0,900 L0,560 L260,330 L430,520 L620,300 L840,560 L1020,380 L1240,600 L1420,430 L1600,580 L1600,900 Z" fill={p.land2} />
          {scene === "switzerland" && (
            <g fill="#f5f1e8" opacity={0.85}>
              <path d="M230,357 L260,330 L292,362 L272,376 L252,362 L240,374 Z" />
              <path d="M592,332 L620,300 L650,334 L630,350 L612,336 L600,348 Z" />
              <path d="M994,408 L1020,380 L1048,410 L1030,424 L1012,410 L1000,422 Z" />
            </g>
          )}
          <path d="M0,900 L0,680 L300,560 L560,700 L860,580 L1180,720 L1440,620 L1600,700 L1600,900 Z" fill={p.land} />
          {scene === "switzerland" && <path d="M480,780 Q800,740 1120,780 L1120,900 L480,900 Z" fill={p.land2} opacity={0.7} />}
        </g>
      );
    case "elephant-rock":
      return (
        <g>
          <path d="M560,900 L560,480 Q560,330 700,310 Q860,290 940,360 Q1010,420 1010,520 L1010,620 Q1010,650 980,650 L920,650 Q890,650 890,610 L890,540 Q890,470 820,470 Q750,470 750,560 L750,900 Z" fill={p.land} />
          <path d="M0,900 L0,650 Q200,610 400,670 L480,900 Z" fill={p.land2} opacity={0.85} />
          <path d="M1600,900 L1600,630 Q1380,610 1200,680 L1140,900 Z" fill={p.land2} opacity={0.85} />
        </g>
      );
    case "serene-city":
      return (
        <g fill={p.land}>
          {/* distant, respectful skyline — domes and slender minarets on the horizon */}
          <rect x="0" y="700" width="1600" height="200" />
          <path d="M700,700 Q700,600 800,585 Q900,600 900,700 Z" fill={p.land2} />
          <circle cx="800" cy="588" r="7" fill={p.glow} opacity={0.8} />
          <g fill={p.land2}>
            <rect x="520" y="480" width="18" height="220" rx="8" />
            <rect x="1062" y="480" width="18" height="220" rx="8" />
            <rect x="300" y="560" width="14" height="140" rx="6" />
            <rect x="1286" y="560" width="14" height="140" rx="6" />
          </g>
          <g fill={p.glow} opacity={0.7}>
            <circle cx="529" cy="472" r="5" />
            <circle cx="1071" cy="472" r="5" />
            <circle cx="307" cy="552" r="4" />
            <circle cx="1293" cy="552" r="4" />
          </g>
          <path d="M0,700 L0,660 Q240,640 480,672 L480,700 Z" fill={p.land2} opacity={0.7} />
          <path d="M1600,700 L1600,660 Q1360,640 1120,672 L1120,700 Z" fill={p.land2} opacity={0.7} />
        </g>
      );
    case "dunes":
      return (
        <g>
          <path d="M0,900 L0,600 Q400,480 800,600 T1600,560 L1600,900 Z" fill={p.land2} />
          <path d="M0,900 L0,700 Q480,580 900,720 T1600,680 L1600,900 Z" fill={p.land} />
          <path d="M0,900 L0,800 Q600,700 1100,820 T1600,790 L1600,900 Z" fill={p.land2} opacity={0.9} />
          <path d="M120,690 Q500,600 830,684" stroke={p.glow} strokeWidth="2" fill="none" opacity={0.3} />
        </g>
      );
    case "village":
      return (
        <g fill={p.land}>
          <path d="M0,900 L0,560 L320,380 L560,520 L800,360 L1080,540 L1320,420 L1600,560 L1600,900 Z" fill={p.land2} />
          <g>
            <rect x="500" y="580" width="120" height="320" />
            <path d="M500,580 L560,540 L620,580 Z" />
            <rect x="660" y="540" width="140" height="360" fill={p.land2} />
            <path d="M660,540 L730,495 L800,540 Z" fill={p.land2} />
            <rect x="840" y="600" width="110" height="300" />
            <path d="M840,600 L895,560 L950,600 Z" />
            <rect x="990" y="640" width="100" height="260" fill={p.land2} />
          </g>
          <g fill={p.glow} opacity={0.55}>
            <rect x="540" y="640" width="14" height="18" rx="3" />
            <rect x="710" y="600" width="14" height="18" rx="3" />
            <rect x="880" y="660" width="14" height="18" rx="3" />
            <rect x="590" y="720" width="14" height="18" rx="3" />
            <rect x="760" y="700" width="14" height="18" rx="3" />
          </g>
        </g>
      );
    case "globe":
      return (
        <g>
          <circle cx="800" cy="620" r="330" fill={p.land2} opacity={0.9} />
          <circle cx="800" cy="620" r="330" fill="none" stroke={p.glow} strokeWidth="1.5" opacity={0.5} />
          <ellipse cx="800" cy="620" rx="330" ry="120" fill="none" stroke={p.glow} strokeWidth="1" opacity={0.3} />
          <ellipse cx="800" cy="620" rx="180" ry="330" fill="none" stroke={p.glow} strokeWidth="1" opacity={0.3} />
          <g stroke={p.glow} fill="none" opacity={0.75} strokeWidth="2">
            <path d="M840,560 Q980,380 1180,420" />
            <path d="M840,560 Q700,320 480,380" />
            <path d="M840,560 Q1040,560 1220,640" />
            <path d="M840,560 Q620,480 430,560" />
            <path d="M840,560 Q900,300 1080,260" />
          </g>
          <g fill={p.glow}>
            <circle cx="840" cy="560" r="7" />
            <circle cx="1180" cy="420" r="4" />
            <circle cx="480" cy="380" r="4" />
            <circle cx="1220" cy="640" r="4" />
            <circle cx="430" cy="560" r="4" />
            <circle cx="1080" cy="260" r="4" />
          </g>
        </g>
      );
    case "london":
      return (
        <g fill={p.land}>
          <rect x="0" y="700" width="1600" height="200" fill={p.land2} opacity={0.9} />
          <rect x="700" y="330" width="70" height="370" />
          <path d="M700,330 L735,270 L770,330 Z" />
          <rect x="712" y="360" width="46" height="46" rx="6" fill={p.land2} />
          <circle cx="735" cy="383" r="16" fill={p.glow} opacity={0.75} />
          <path d="M800,700 L800,460 L840,430 L880,460 L880,700 Z" />
          <path d="M900,700 L900,480 L1080,480 L1080,700 Z" fill={p.land2} />
          <path d="M900,480 L920,450 L940,480 M960,480 L980,450 L1000,480 M1020,480 L1040,450 L1060,480" stroke={p.land2} strokeWidth="8" fill="none" />
          <rect x="420" y="520" width="120" height="180" fill={p.land2} />
          <path d="M0,740 Q400,720 800,740 T1600,740 L1600,900 L0,900 Z" fill={p.land} />
        </g>
      );
    case "paris":
      return (
        <g fill={p.land}>
          <rect x="0" y="720" width="1600" height="180" fill={p.land2} opacity={0.9} />
          <path d="M800,240 L760,470 L700,720 L740,720 Q800,600 860,720 L900,720 L840,470 Z" />
          <path d="M724,560 Q800,520 876,560" stroke={p.land} strokeWidth="14" fill="none" />
          <path d="M756,400 Q800,380 844,400" stroke={p.land} strokeWidth="10" fill="none" />
          <rect x="794" y="200" width="12" height="46" />
          <rect x="240" y="600" width="200" height="120" fill={p.land2} />
          <rect x="1160" y="580" width="220" height="140" fill={p.land2} />
          <g fill={p.glow} opacity={0.5}>
            {Array.from({ length: 12 }, (_, i) => (
              <rect key={i} x={260 + rnd(i, 11) * 1080} y={610 + rnd(i, 13) * 80} width="8" height="12" rx="2" />
            ))}
          </g>
        </g>
      );
    case "dubai":
      return (
        <g fill={p.land}>
          <path d="M780,900 L780,420 L800,180 L820,420 L820,900 Z" />
          <path d="M740,900 L740,520 L780,440 L780,900 Z" fill={p.land2} />
          <path d="M860,900 L860,520 L820,440 L820,900 Z" fill={p.land2} />
          <path d="M520,900 L520,560 Q560,480 600,560 L600,900 Z" />
          <path d="M1050,900 L1000,600 Q1080,520 1120,620 L1100,900 Z" />
          <rect x="300" y="620" width="120" height="280" fill={p.land2} />
          <rect x="1230" y="600" width="110" height="300" fill={p.land2} />
          <g fill={p.glow} opacity={0.5}>
            {Array.from({ length: 22 }, (_, i) => (
              <rect key={i} x={320 + rnd(i, 17) * 1000} y={560 + rnd(i, 19) * 280} width="7" height="10" rx="2" />
            ))}
          </g>
        </g>
      );
    case "istanbul":
      return (
        <g fill={p.land}>
          <rect x="0" y="710" width="1600" height="190" fill={p.land2} opacity={0.9} />
          <path d="M620,710 Q620,570 790,550 Q960,570 960,710 Z" />
          <circle cx="790" cy="552" r="8" fill={p.glow} opacity={0.8} />
          <path d="M680,710 Q680,630 730,620 Q780,630 780,710 Z" fill={p.land2} />
          <path d="M800,710 Q800,630 850,620 Q900,630 900,710 Z" fill={p.land2} />
          <g fill={p.land2}>
            <rect x="540" y="470" width="16" height="240" rx="7" />
            <rect x="1024" y="470" width="16" height="240" rx="7" />
          </g>
          <g fill={p.glow} opacity={0.7}>
            <circle cx="548" cy="462" r="5" />
            <circle cx="1032" cy="462" r="5" />
          </g>
          <path d="M0,780 Q300,760 560,780 L560,820 Q300,806 0,820 Z" fill={p.land} />
          <path d="M1040,780 Q1340,760 1600,780 L1600,820 Q1340,806 1040,820 Z" fill={p.land} />
        </g>
      );
    case "newyork":
      return (
        <g fill={p.land}>
          <rect x="0" y="720" width="1600" height="180" fill={p.land2} opacity={0.9} />
          <rect x="620" y="330" width="80" height="390" />
          <path d="M620,330 L660,260 L700,330 Z" />
          <rect x="654" y="230" width="12" height="40" />
          <rect x="740" y="420" width="90" height="300" fill={p.land2} />
          <rect x="870" y="380" width="70" height="340" />
          <rect x="980" y="460" width="110" height="260" fill={p.land2} />
          <rect x="460" y="480" width="110" height="240" fill={p.land2} />
          <g>
            <rect x="240" y="560" width="26" height="160" />
            <path d="M253,560 L253,520 M240,530 L266,530" stroke={p.land} strokeWidth="8" />
            <circle cx="253" cy="512" r="10" />
          </g>
          <g fill={p.glow} opacity={0.5}>
            {Array.from({ length: 26 }, (_, i) => (
              <rect key={i} x={470 + rnd(i, 23) * 600} y={420 + rnd(i, 29) * 260} width="7" height="10" rx="2" />
            ))}
          </g>
        </g>
      );
    case "japan":
      return (
        <g>
          <path d="M400,900 L400,700 Q800,300 1200,700 L1200,900 Z" fill={p.land2} />
          <path d="M690,470 Q800,380 910,470 L860,470 Q800,430 740,470 Z" fill="#f5f1e8" opacity={0.9} />
          <g fill={p.land}>
            <rect x="330" y="640" width="120" height="26" rx="8" />
            <rect x="350" y="666" width="80" height="60" />
            <rect x="316" y="726" width="148" height="26" rx="8" />
            <rect x="342" y="752" width="96" height="70" />
            <rect x="300" y="822" width="180" height="28" rx="8" />
          </g>
          <g fill={p.glow} opacity={0.35}>
            {Array.from({ length: 14 }, (_, i) => (
              <circle key={i} cx={1100 + rnd(i, 31) * 420} cy={500 + rnd(i, 37) * 300} r={4 + rnd(i, 41) * 5} />
            ))}
          </g>
          <path d="M0,900 L0,820 Q400,780 800,830 T1600,820 L1600,900 Z" fill={p.land} />
        </g>
      );
    case "clouds":
    default:
      return (
        <g fill={p.land2} opacity={0.9}>
          <ellipse cx="300" cy="760" rx="380" ry="110" />
          <ellipse cx="900" cy="820" rx="460" ry="130" />
          <ellipse cx="1450" cy="760" rx="360" ry="110" />
          <ellipse cx="620" cy="700" rx="240" ry="70" opacity={0.7} />
          <ellipse cx="1180" cy="690" rx="220" ry="60" opacity={0.6} />
        </g>
      );
  }
}

/**
 * Procedural cinematic backdrop. Deterministic (SSR-safe), theme-true,
 * and cheap to render. Serves as the base layer and the fallback when
 * no Seedance footage is present for a scene.
 */
export default function SceneArt({
  scene,
  hue = "navy",
  className,
  stars = true,
}: {
  scene: AnyScene;
  hue?: Hue;
  className?: string;
  stars?: boolean;
}) {
  const p = palettes[hue];
  const uid = useId().replace(/[:§]/g, "");
  const skyId = `sky-${uid}`;
  const glowId = `glow-${uid}`;

  return (
    <svg
      className={className}
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.sky[0]} />
          <stop offset="55%" stopColor={p.sky[1]} />
          <stop offset="100%" stopColor={p.sky[2]} />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="68%" r="55%">
          <stop offset="0%" stopColor={p.glow} stopOpacity="0.55" />
          <stop offset="40%" stopOpacity="0.18" stopColor={p.glow} />
          <stop offset="100%" stopOpacity="0" stopColor={p.glow} />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${skyId})`} />
      {stars && <Stars seed={scene.length} />}
      <rect width="1600" height="900" fill={`url(#${glowId})`} />
      <circle cx="800" cy="640" r="52" fill={p.glow} opacity={0.5} />
      <circle cx="800" cy="640" r="26" fill="#fff8ea" opacity={0.65} />
      <Silhouette scene={scene} p={p} />
      <Particles color={p.glow} seed={scene.length * 3} />
    </svg>
  );
}
