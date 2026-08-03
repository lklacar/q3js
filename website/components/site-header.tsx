import Image from "next/image";
import Link from "next/link";
import { DiscordLogo, GithubLogo, XLogo } from "@phosphor-icons/react/dist/ssr";
import { MasterStatus } from "@/components/master-status";
import { siteConfig } from "@/lib/seo";

const navItems = [
  { label: "Servers", href: "/#servers" },
  { label: "Scoreboard", href: "/scoreboard" },
  { label: "Run a server", href: "/guide" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-5 px-4">
        <Link href="/" className="mr-auto flex items-center gap-2.5" aria-label="Q3JS home">
          <Image src="/quake3.svg" alt="" width={24} height={24} className="size-6" priority />
          <span className="font-mono text-xl font-black uppercase tracking-[0.04em]">Q3JS</span>
          <span className="font-mono text-xs text-muted-foreground">0.0.1</span>
        </Link>

        <div className="hidden items-center gap-5 md:flex">
          <MasterStatus />
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-mono text-sm uppercase tracking-[0.05em] text-muted-foreground transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="md:hidden">
          <MasterStatus />
        </div>

        <a
          href="https://github.com/lklacar/q3js"
          target="_blank"
          rel="noreferrer"
          className="hidden text-muted-foreground transition-colors hover:text-primary sm:block"
          aria-label="Q3JS on GitHub"
        >
          <GithubLogo className="size-5" weight="fill" />
        </a>
        <a
          href={siteConfig.author.xUrl}
          target="_blank"
          rel="author noreferrer"
          className="hidden text-muted-foreground transition-colors hover:text-primary sm:block"
          aria-label={`${siteConfig.author.name} on X`}
        >
          <XLogo className="size-5" weight="bold" />
        </a>
        <a
          href="https://discord.gg/mKvM9su443"
          target="_blank"
          rel="noreferrer"
          className="hidden text-muted-foreground transition-colors hover:text-primary sm:block"
          aria-label="Q3JS Discord"
        >
          <DiscordLogo className="size-5" weight="fill" />
        </a>
      </div>
    </header>
  );
}
