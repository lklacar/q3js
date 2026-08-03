import { Footer } from "@/components/footer";
import { HomeStats } from "@/components/home-stats";
import { JsonLd } from "@/components/json-ld";
import { ScoreboardPreview } from "@/components/scoreboard-preview";
import { ServerBrowser } from "@/components/server-browser";
import { SiteHeader } from "@/components/site-header";
import { absoluteUrl, buildPageMetadata, siteConfig } from "@/lib/seo";

const homeMetadata = buildPageMetadata({
  title: siteConfig.defaultTitle,
  description: siteConfig.description,
  path: "/",
});

export const metadata = {
  ...homeMetadata,
  // A title template only applies to child route segments, while the home page
  // shares the root layout segment. Keep the brand suffix explicit here.
  title: { absolute: `${siteConfig.defaultTitle} | ${siteConfig.name}` },
};

const homeStructuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: siteConfig.language,
    potentialAction: {
      "@type": "ViewAction",
      name: "Browse live Quake III Arena servers",
      target: absoluteUrl("/#servers"),
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    applicationCategory: "GameApplication",
    operatingSystem: "Web Browser",
    genre: "First-person shooter",
    image: absoluteUrl("/opengraph-image"),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  },
] satisfies ReadonlyArray<Record<string, unknown>>;

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <JsonLd data={homeStructuredData} />
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 md:pt-14">
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Quake III Arena in your browser</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Choose a server and join. Q3JS runs the official Quake III demo through an ioquake3
            WebAssembly build.
          </p>
        </div>
        <HomeStats />
        <ScoreboardPreview />
        <ServerBrowser />
      </main>

      <Footer />
    </div>
  );
}
