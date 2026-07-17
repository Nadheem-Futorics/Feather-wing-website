# Feather Wing Tours — Cinematic Scroll Website

Premium, scroll-driven cinematic website for **Feather Wing Tours**.
*Your Journey. Our Passion. — One Wing. Endless Destinations.*

## Run it

```bash
cd site
npm install
npm run dev     # → http://localhost:3000
```

## What's inside

- **Hero 3D scroll journey — real Seedance 2.0 footage** (~2000vh, pinned):
  every scene is a generated video clip converted to a WebP frame sequence and
  drawn on a full-screen canvas; **scroll position = frame index** (GSAP
  ScrollTrigger + Lenis, fully reversible). Logo reveal → light-to-bird
  transformation → first flight → 15 Saudi destinations → gold divider →
  8 international destinations → finale + CTAs. Scenes preload progressively
  (current + next), distant scenes are evicted from memory.
- **10 immersive service chapters — scroll-scrubbed video**: each chapter is a
  220vh pinned section whose Seedance clip's `currentTime` is driven by scroll
  progress (keyframe-dense H.264 + VP9 encodes for clean reverse seeking; the
  clips never autoplay). Floating navigator (vertical desktop / horizontal
  mobile strip).
- **Media pipeline**: masters in `site/public/videos/src`, web encodes in
  `site/public/videos` (+ `mobile/`), posters in `site/public/media/posters`,
  frame sequences in `site/public/frames`. Rerun
  `node scripts/build-media-manifest.mjs` after adding clips.
- Posters are used **only** for loading states and the `prefers-reduced-motion`
  fallback.
- About (editable animated stats), Featured Trips (filterable demo cards),
  Why Travel, Testimonials (placeholders), Plan Your Journey enquiry form
  (validation, honeypot + timing + rate-limit spam prevention, loading /
  success / error states), final cinematic CTA, full footer.
- **EN / العربية** with full RTL layout, language persisted locally.
- SEO: metadata, Open Graph, TravelAgency/Service/Breadcrumb/FAQ JSON-LD,
  sitemap, robots, hreflang.

## Add the official logo

Place the provided logo PNG at **`site/public/brand/logo.png`** — it is used
as-is everywhere (nav, hero, footer). Until then an on-brand typographic
lock-up renders so nothing breaks.

## Upgrade scenes to Seedance 2.0 footage

The Higgsfield account had 10 free credits; one Seedance clip costs 36, so
footage couldn't be generated yet. The **master bird** and 3 hero posters were
generated and are live in the hero. When credits are available:

1. Follow **`SEEDANCE-PROMPTS.md`** (every clip's prompt, settings and the
   bird-consistency reference workflow).
2. Drop clips into `site/public/videos/`, posters into `site/public/media/`.
3. Point the matching entry in `site/src/data/media.ts` at the files.

Scenes upgrade automatically — no component changes needed.

## Editable content (CMS-ready data layer)

| File | Contents |
|------|----------|
| `site/src/data/site.ts` | phone / WhatsApp / email / address / socials / stats (all placeholders) |
| `site/src/data/destinations.ts` | Saudi + international journey order, titles, lines |
| `site/src/data/services.ts` | 10 services, copy, CTAs |
| `site/src/data/trips.ts` | featured trip cards (demo content) |
| `site/src/data/testimonials.ts` | placeholder reviews — replace with real ones |
| `site/src/data/seo.ts` | per-section metadata + FAQ |
| `site/src/data/media.ts` | poster/video manifest per scene |

The enquiry API (`src/app/api/enquiry/route.ts`) logs submissions server-side;
wire it to email/CRM before production.
