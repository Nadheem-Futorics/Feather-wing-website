// Scans public/frames + public/videos and emits src/data/media.generated.json
// Rerun after adding or regenerating clips:  node scripts/build-media-manifest.mjs
import { readdirSync, existsSync, writeFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");
const framesDir = join(pub, "frames");
const videosDir = join(pub, "videos");

const manifest = {};

if (existsSync(framesDir)) {
  for (const base of readdirSync(framesDir)) {
    const dir = join(framesDir, base);
    if (!statSync(dir).isDirectory()) continue;
    const frames = readdirSync(dir).filter((f) => f.endsWith(".webp")).length;
    manifest[base] = { ...(manifest[base] ?? {}), frames };
  }
}

if (existsSync(videosDir)) {
  for (const f of readdirSync(videosDir)) {
    if (f.endsWith(".mp4")) {
      const base = f.replace(/\.mp4$/, "");
      manifest[base] = { ...(manifest[base] ?? {}), mp4: true };
    }
    if (f.endsWith(".webm")) {
      const base = f.replace(/\.webm$/, "");
      manifest[base] = { ...(manifest[base] ?? {}), webm: true };
    }
  }
  const mob = join(videosDir, "mobile");
  if (existsSync(mob)) {
    for (const f of readdirSync(mob)) {
      if (!f.endsWith(".mp4")) continue;
      const base = f.replace(/\.mp4$/, "");
      manifest[base] = { ...(manifest[base] ?? {}), mobile: true };
    }
  }
}

const out = join(root, "src", "data", "media.generated.json");
writeFileSync(out, JSON.stringify(manifest, null, 2));
console.log(`media manifest: ${Object.keys(manifest).length} clips → ${out}`);
