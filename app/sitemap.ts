import type { MetadataRoute } from "next";
import { cases, site } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${site.url}/`, lastModified: now, priority: 1 },
    { url: `${site.url}/cv`, lastModified: now, priority: 0.9 },
    ...cases.map((c) => ({ url: `${site.url}/work/${c.slug}`, lastModified: now, priority: 0.7 })),
  ];
}
