# Deploying to Railway

This app stores everything (admin login, trips, itineraries, the concierge's
knowledge base, meetings, quote enquiries) in a local SQLite file via
`node:sqlite` — a real Node process with a persistent disk, not a serverless
platform. That's why Railway (or Fly.io/a VPS) rather than Vercel: Railway
gives you exactly that, with a volume that survives restarts and deploys.

## One-time setup (you do this — needs your own Railway account)

1. **Install the CLI** (no global install needed, `npx` downloads it on demand):
   ```
   npx @railway/cli login
   ```
   This opens a browser for you to log in / create a free Railway account.

2. **From the `site/` directory, create the project:**
   ```
   npx @railway/cli init
   ```
   Choose "Empty Project" and give it a name (e.g. `feather-wing-tours`).

3. **Attach a persistent volume** (this is the step that makes the database
   survive deploys — skip it and you're back to the Vercel problem):
   - In the Railway dashboard, open your new service → **Settings → Volumes**
     → **New Volume**.
   - Mount path: `/data`
   - Size: 1GB is plenty to start.

4. **Set environment variables** (dashboard → your service → **Variables**,
   or `npx @railway/cli variables --set KEY=value` per line). At minimum:
   ```
   SESSION_SECRET=<generate a random 32+ char string>
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=<pick a real password — this only seeds the first account>
   TP_DATA_DIR=/data
   NEXT_PUBLIC_APP_URL=https://<your-service>.up.railway.app
   GEMINI_API_KEY=<from https://aistudio.google.com/apikey, optional but recommended>
   ```
   Everything else in `.env.example` (Google Calendar, Google Maps, weather/currency
   providers) is optional — those features work in a labeled dev-fallback mode
   without them.

5. **Deploy:**
   ```
   npx @railway/cli up
   ```
   This uploads the current directory and builds/starts it per `railway.toml`.
   Railway gives you a `*.up.railway.app` URL when it's done — update
   `NEXT_PUBLIC_APP_URL` (step 4) to match once you know it, then redeploy
   (`npx @railway/cli up` again) so links/canonicals/OG tags use the real URL.

6. **Custom domain (optional):** Settings → Networking → Custom Domain, then
   point your DNS at the CNAME Railway gives you. Also update `siteUrl` in
   `src/data/site.ts` to your real domain and redeploy — that value drives
   canonical URLs, the sitemap, and JSON-LD structured data.

## What ships automatically

- `railway.toml` — build/start commands, restart policy, and a lightweight
  `/robots.txt` healthcheck.
- `package.json`'s `engines.node` field pins Node ≥22.5 (required for
  `node:sqlite`) so Railway's build image matches.
- First boot on an empty volume auto-creates the schema and seeds one admin
  account from `ADMIN_USERNAME`/`ADMIN_PASSWORD` — same as local dev.

## After deploying

- Log in at `https://<your-domain>/admin/login` and change the admin password
  immediately (top bar → "Change password") — don't leave the seeded one live.
- If you didn't set `GEMINI_API_KEY`/`ANTHROPIC_API_KEY`, the AI concierge and
  trip-planner assistant keep working in their labeled sample-data mode —
  nothing breaks, it's just not "live" AI until you add a key.
