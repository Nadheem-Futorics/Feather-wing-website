# Feather Wing Tours — Travel Plan Management

A Wanderlog-inspired (original implementation) planning workspace that turns
customer itineraries into quote enquiries for the company.

## Run

```bash
npm install
npm run dev            # or: npm run build && PORT=3100 npm start
npm run typecheck      # tsc
npm test               # vitest unit tests
```

Works with **zero external keys**: SQLite (Node's built-in `node:sqlite`),
Leaflet + OpenStreetMap map, labeled sample places/weather/FX, and a labeled
development AI assistant. Configure `.env` (see `.env.example`) to activate
live providers.

## Routes

| Route | Purpose |
|---|---|
| `/trip-planner` | Marketing entry (linked from main nav + featured trips) |
| `/trips`, `/trips/new` | Trip list · 4-step creation wizard (draft autosaved) |
| `/trips/[id]` | Planner workspace: day board (dnd-kit), map, Explore, AI assistant |
| `/trips/[id]/budget` | Planned vs actual, categories, splits, settlement |
| `/trips/[id]/documents` | Reservations + private uploads (signed 15-min URLs) |
| `/trips/[id]/checklists` | Template "AI" suggestions + manual items |
| `/trips/[id]/share` | Invites (owner/editor/viewer), comments, activity log |
| `/trips/[id]/quote` | Quote enquiry with structured trip summary + WhatsApp link |
| `/trips/join?token=` | Invitation acceptance |
| `/admin/login` | Admin portal login (username/password, seeded from `ADMIN_USERNAME`/`ADMIN_PASSWORD`) |
| `/admin/trip-enquiries` | Admin enquiry inbox |
| `/admin/travel-content` | Featured Trips / Offers / Knowledge Base editor |
| `/admin/meetings` | Schedule meetings, optionally synced to Google Calendar |

All APIs live under `/api/tp/*`; every input is Zod-validated, every trip
route authorizes membership (404 for non-members), and AI/place/route/quote
endpoints are rate-limited (SQLite fixed window).

## Architecture decisions

- **Database — SQLite via `node:sqlite`** (zero deps, runs anywhere). The
  spec's Supabase fallback needs cloud provisioning + credentials that don't
  exist in this repo; repositories (`src/server/repo/*`) are the seam — port
  them to Postgres/Supabase and the feature code doesn't change. Schema:
  `src/server/schema.sql` (26 tables, UUID PKs, indexes, soft deletes).
- **Auth — signed guest sessions** (`src/server/session.ts`): HMAC cookie +
  profile row; the site has no auth provider today. `getSessionProfile()` is
  the swap point for Supabase Auth/NextAuth. Roles: owner/editor/viewer.
- **Maps — Leaflet + OSM** as the working default (`MapView.tsx`);
  `GOOGLE_MAPS_SERVER_API_KEY` activates Google Places (New) with field
  masks + 24 h `place_cache`, and Google Routes (traffic-aware) with
  estimator fallback (`src/server/providers/*`).
- **Optimizer — deterministic heuristic** (`src/server/optimizer.ts`): anchor
  locked/timed items → nearest-neighbour + 2-opt clustering → sequential
  scheduling with pace limits, category opening hours, lunch break, overflow
  to next day. Never drops items; outputs conflicts + explanations; applied
  only through a previewed, undoable change proposal.
- **AI — Anthropic tool-use** (`src/server/ai/assistant.ts`): env-driven
  model (`ANTHROPIC_MODEL`), 12 Zod-validated tools, streaming NDJSON.
  Mutations only via `create_itinerary_change_preview` → `ai_change_proposals`
  → user Apply/Cancel (+ Undo). Locked items are guarded server-side. The
  system prompt forbids uncited prices/availability/hours/weather/visa claims;
  non-live tool data is labeled. Without a key, a **DevAssistant** (clearly
  labeled) still produces sample-data proposals so flows are testable.
- **Collaboration** — invite tokens (7-day expiry), role checks on every
  mutation, activity log, comments, optimistic-concurrency `version` on trips,
  25 s polling refresh. Realtime presence/broadcast: phase two.

## Phase two (deferred)

Supabase/Postgres + RLS, realtime presence, Google Maps JS renderer,
live weather/FX providers, email notifications, PWA/offline, e2e browser
tests, `/admin/travel-content` package editor (packages seed from
`src/data/trips.ts` today), reservation email import adapter.
