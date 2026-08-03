import type { Metadata } from "next";

const configuredSiteUrl = process.env.NEXT_PUBLIC_Q3JS_SITE_URL?.trim().replace(/\/$/, "");

export const siteConfig = {
  name: "Q3JS",
  url: configuredSiteUrl || "https://q3js.com",
  author: {
    name: "LK",
    coloredName: "^1L^2K",
    url: "https://github.com/lklacar",
    xHandle: "@lukathedev",
    xUrl: "https://x.com/lukathedev",
  },
  defaultTitle: "Play Quake III Arena in Your Browser",
  description:
    "Play Quake III Arena instantly with no install. Q3JS brings the classic arena shooter to the web with WebAssembly and online servers.",
  locale: "en_US",
  language: "en-US",
  keywords: [
    "Quake 3",
    "Quake III Arena",
    "browser game",
    "WebAssembly game",
    "FPS",
    "arena shooter",
    "Q3JS",
    "multiplayer browser game",
    "ioquake3",
    "retro FPS",
  ],
} as const;

export const socialImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Q3JS — Play Quake III Arena in your browser",
} as const;

export function absoluteUrl(path: string): string {
  if (path === "/") return siteConfig.url;
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildPageMetadata({
  description,
  keywords = siteConfig.keywords,
  path,
  robots,
  title,
}: {
  description: string;
  keywords?: readonly string[];
  path: string;
  robots?: Metadata["robots"];
  title: string;
}): Metadata {
  const pageTitle = `${title} | ${siteConfig.name}`;
  return {
    title,
    description,
    keywords: [...keywords],
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      url: absoluteUrl(path),
      siteName: siteConfig.name,
      title: pageTitle,
      description,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      creator: siteConfig.author.xHandle,
      title: pageTitle,
      description,
      images: ["/twitter-image"],
    },
    robots,
  };
}
