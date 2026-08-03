import Link from "next/link";
import { Q3ColoredText } from "@/components/q3-colored-text";
import { siteConfig } from "@/lib/seo";

export function Footer() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-6 text-sm leading-6 text-muted-foreground md:grid-cols-[1fr_auto]">
        <div>
          <p className="mb-1 font-mono text-xs uppercase tracking-[0.14em] text-primary">Q3JS // Browser arena</p>
          <p className="max-w-3xl">
            Q3JS is a non-commercial fan project using the officially released demo data and a
            GPL-licensed ioquake3 engine build. Not affiliated with id Software or ZeniMax.
          </p>
          <p className="mt-2 text-foreground">
            Designed, built, and maintained by{" "}
            <a
              href={siteConfig.author.url}
              target="_blank"
              rel="author noreferrer"
              className="font-semibold text-primary hover:text-foreground"
            >
              <Q3ColoredText text={siteConfig.author.coloredName} />
            </a>
            .
          </p>
        </div>
        <div className="flex flex-wrap content-start gap-x-4 md:justify-end">
          <Link href="/guide" className="hover:text-foreground">Run a server</Link>
          <a href="https://github.com/lklacar/q3js" target="_blank" rel="noreferrer" className="hover:text-foreground">
            GitHub source
          </a>
          <a href={siteConfig.author.xUrl} target="_blank" rel="author noreferrer" className="hover:text-foreground">
            X / {siteConfig.author.xHandle}
          </a>
          <a href="https://discord.gg/mKvM9su443" target="_blank" rel="noreferrer" className="hover:text-foreground">
            Discord
          </a>
        </div>
      </div>
    </footer>
  );
}
