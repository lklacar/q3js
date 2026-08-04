import type { MetadataRoute } from "next";
import { getProfileSitemap } from "@/lib/api/generated/sdk.gen";
import { serverApiClient } from "@/lib/api/server-client";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

function staticEntries(lastModified: Date): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      changeFrequency: "daily",
      priority: 1,
      lastModified,
    },
    {
      url: absoluteUrl("/scoreboard"),
      changeFrequency: "hourly",
      priority: 0.9,
      lastModified,
    },
    {
      url: absoluteUrl("/scoreboard/distribution"),
      changeFrequency: "hourly",
      priority: 0.8,
      lastModified,
    },
    {
      url: absoluteUrl("/guide"),
      changeFrequency: "weekly",
      priority: 0.8,
      lastModified,
    },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const generatedAt = new Date();
  const entries = staticEntries(generatedAt);

  try {
    const { data: profiles } = await getProfileSitemap({
      client: serverApiClient,
      cache: "no-store",
    });
    return [
      ...entries,
      ...profiles.map((profile) => ({
        url: absoluteUrl(`/players/${encodeURIComponent(profile.playerName)}`),
        changeFrequency: "daily" as const,
        priority: 0.7,
        lastModified: new Date(profile.lastModified),
      })),
    ];
  } catch {
    return entries;
  }
}
