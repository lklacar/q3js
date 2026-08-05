import Link from "next/link";
import { Coffee } from "@phosphor-icons/react/dist/ssr";
import { Footer } from "@/components/footer";
import { HomeStats } from "@/components/home-stats";
import { InviteFriendsDialog } from "@/components/invite-friends-dialog";
import { JsonLd } from "@/components/json-ld";
import { Q3ColoredText } from "@/components/q3-colored-text";
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
    author: {
      "@type": "Person",
      name: siteConfig.author.name,
      url: siteConfig.author.url,
      sameAs: [siteConfig.author.url, siteConfig.author.xUrl],
    },
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
      <InviteFriendsDialog />
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 md:pt-14">
        <section aria-labelledby="hero-heading" className="mb-14 py-6 text-center sm:py-8">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
            Quake 3 in browser
          </p>
          <h1
            id="hero-heading"
            className="mx-auto mt-3 max-w-4xl font-mono text-3xl font-bold uppercase leading-tight tracking-[0.035em] md:text-4xl"
          >
            Play Quake III Multiplayer in Your Browser
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            No install step. Pick a server and jump straight into a live Quake 3 match.
          </p>
          <div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
            <Link
              href="/#servers"
              className="inline-flex h-10 items-center justify-center bg-primary px-4 font-mono text-sm font-bold uppercase tracking-[0.05em] text-primary-foreground hover:bg-primary/80"
            >
              Play now
            </Link>
            <Link
              href="/scoreboard"
              className="inline-flex h-10 items-center justify-center bg-secondary px-4 font-mono text-sm font-bold uppercase tracking-[0.05em] text-secondary-foreground hover:bg-secondary/80"
            >
              Scoreboard
            </Link>
            <a
              href={siteConfig.supportUrl}
              target="_blank"
              rel="noreferrer"
              className="col-span-2 inline-flex h-10 items-center justify-center gap-2 bg-primary px-4 font-mono text-sm font-bold uppercase tracking-[0.05em] text-primary-foreground transition-colors hover:bg-primary/80 sm:col-span-1"
            >
              <Coffee className="size-4" weight="fill" aria-hidden="true" />
              Support Q3JS
            </a>
          </div>
          <p className="mt-5 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Created by{" "}
            <a
              href={siteConfig.author.xUrl}
              target="_blank"
              rel="author noreferrer"
              className="font-bold hover:text-foreground"
            >
              <Q3ColoredText text={siteConfig.author.coloredName} />
            </a>
          </p>
          <a
            href="https://jk.q3js.com"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary"
          >
            New: Play Jedi Academy ↗
          </a>
        </section>
        <HomeStats />
        <ServerBrowser />
        <ScoreboardPreview />
      </main>

      <Footer />
    </div>
  );
}
