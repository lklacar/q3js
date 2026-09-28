import Link from "next/link";
import { ArrowSquareOut, Coffee } from "@phosphor-icons/react/dist/ssr";
import { CounterStrikeDialog } from "@/components/counter-strike-dialog";
import { Footer } from "@/components/footer";
import { HomeStats } from "@/components/home-stats";
import { JsonLd } from "@/components/json-ld";
import { Q3ColoredText } from "@/components/q3-colored-text";
import { ScoreboardPreview } from "@/components/scoreboard-preview";
import { ServerBrowser } from "@/components/server-browser";
import { SiteHeader } from "@/components/site-header";
import { csjsPromotionUrl } from "@/lib/cross-promotion";
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

const otherGames = [
  {
    name: "Counter-Strike",
    description: "Classic tactical multiplayer, directly in your browser.",
    href: csjsPromotionUrl("homepage_hero"),
  },
  {
    name: "Jedi Academy",
    description: "Lightsabers, Force powers, and multiplayer duels.",
    href: "https://jk.q3js.com",
  },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <JsonLd data={homeStructuredData} />
      <SiteHeader />
      <CounterStrikeDialog />
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-7 sm:pb-20 sm:pt-10 md:pt-14">
        <section aria-labelledby="hero-heading" className="mb-10 py-5 text-center sm:mb-14 sm:py-8">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
            Quake 3 in browser
          </p>
          <h1
            id="hero-heading"
            className="mx-auto mt-3 max-w-4xl font-mono text-[1.75rem] font-bold uppercase leading-[1.15] tracking-[0.025em] sm:text-3xl sm:tracking-[0.035em] md:text-4xl"
          >
            Play Quake III Multiplayer in Your Browser
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            No install step. Pick a server and jump straight into a live Quake 3 match.
          </p>
          <div className="mx-auto mt-6 grid max-w-2xl gap-2 min-[380px]:grid-cols-2 sm:grid-cols-3 sm:gap-3">
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
              className="inline-flex h-10 items-center justify-center gap-2 bg-primary px-4 font-mono text-sm font-bold uppercase tracking-[0.05em] text-primary-foreground transition-colors hover:bg-primary/80 min-[380px]:col-span-2 sm:col-span-1"
            >
              <Coffee className="size-4" weight="fill" aria-hidden="true" />
              Buy me a coffee
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
          <aside aria-labelledby="other-games-heading" className="mx-auto mt-7 max-w-2xl text-left">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">More from Q3JS</p>
                <h2 id="other-games-heading" className="mt-1 font-mono text-sm font-bold uppercase tracking-[0.08em] text-foreground">
                  Pick another game
                </h2>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">2 games</span>
            </div>
            <nav aria-label="Other games" className="grid gap-2 sm:grid-cols-2">
              {otherGames.map((game) => (
                <a
                  key={game.name}
                  href={game.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex min-h-24 items-start justify-between gap-3 border border-border bg-background/45 p-4 transition-colors hover:border-primary/70 hover:bg-background/80"
                >
                  <span>
                    <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Play now</span>
                    <span className="mt-1 block font-mono text-lg font-bold uppercase leading-tight tracking-[0.025em] text-foreground">
                      {game.name}
                    </span>
                    <span className="mt-2 block text-xs leading-5 text-muted-foreground">{game.description}</span>
                  </span>
                  <ArrowSquareOut className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" weight="bold" aria-hidden="true" />
                </a>
              ))}
            </nav>
          </aside>
        </section>
        <HomeStats />
        <ServerBrowser />
        <ScoreboardPreview />
      </main>

      <Footer />
    </div>
  );
}
