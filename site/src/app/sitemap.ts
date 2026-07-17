import type { MetadataRoute } from "next";
import { siteUrl } from "@/data/site";

export default function sitemap(): MetadataRoute.Sitemap {
  // Only distinct, indexable documents belong here — same-page anchors
  // (#services, #destinations, ...) are not separate URLs for sitemap
  // purposes, and /admin/*, /trips/* are intentionally noindexed (see
  // their layout.tsx) so they're excluded rather than listed and ignored.
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
      alternates: {
        languages: { en: siteUrl, ar: `${siteUrl}/?lang=ar` },
      },
    },
    {
      url: `${siteUrl}/trip-planner`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: { en: `${siteUrl}/trip-planner`, ar: `${siteUrl}/trip-planner?lang=ar` },
      },
    },
  ];
}
