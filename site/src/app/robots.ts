import type { MetadataRoute } from "next";
import { siteUrl } from "@/data/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // /admin/* and /trips/* already carry a page-level noindex (see their
    // layout.tsx) — that's the correct exclusion signal for pages crawlers
    // may still discover via a link. /api/ is disallowed here too since it
    // never returns HTML and has zero crawl value, only crawl-budget cost.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
