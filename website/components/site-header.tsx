import Link from "next/link";
import { DiscordLogo, GithubLogo } from "@phosphor-icons/react/dist/ssr";
import { MasterStatus } from "@/components/master-status";

const navItems = [
  { label: "Servers", href: "/#servers" },
  { label: "Scoreboard", href: "/scoreboard" },
  { label: "Run a server", href: "/guide" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-5 px-4">
        <Link href="/" className="mr-auto flex items-baseline gap-2" aria-label="Q3JS home">
          <span className="text-xl font-black tracking-[-0.04em]">Q3JS</span>
          <span className="font-mono text-[9px] text-muted-foreground">0.0.1</span>
        </Link>

        <div className="hidden items-center gap-5 md:flex">
          <MasterStatus />
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
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
          className="hidden text-muted-foreground transition-colors hover:text-foreground sm:block"
          aria-label="Q3JS on GitHub"
        >
          <GithubLogo className="size-5" weight="fill" />
        </a>
        <a
          href="https://discord.gg/mKvM9su443"
          target="_blank"
          rel="noreferrer"
          className="hidden text-muted-foreground transition-colors hover:text-foreground sm:block"
          aria-label="Q3JS Discord"
        >
          <DiscordLogo className="size-5" weight="fill" />
        </a>
      </div>
    </header>
  );
}
