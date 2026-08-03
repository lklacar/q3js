import type { MetadataRoute } from "next";
import { absoluteUrl, siteConfig } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/play", "/baseq3/"],
    },
    host: siteConfig.url,
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
