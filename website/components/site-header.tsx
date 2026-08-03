import Link from "next/link";
import { DiscordLogo, GithubLogo } from "@phosphor-icons/react/dist/ssr";
import { MasterStatus } from "@/components/master-status";

const navItems = [
  { label: "Play", href: "/play" },
  { label: "Scoreboard", href: "/#scoreboard" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="mr-auto" aria-label="Q3JS home">
          <span className="text-xl font-black tracking-tight">Q3JS</span>
          <span className="ml-2 text-[10px] text-muted-foreground">v0.0.1</span>
        </Link>

        <div className="hidden items-center gap-2 sm:flex">
          <MasterStatus />
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex h-7 items-center border border-border px-2.5 text-[10px] uppercase text-muted-foreground transition-colors hover:border-foreground/50 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <a
          href="https://github.com/lklacar/q3js"
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Q3JS on GitHub"
        >
          <GithubLogo className="size-5" weight="fill" />
        </a>
        <a
          href="https://discord.gg/mKvM9su443"
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Q3JS Discord"
        >
          <DiscordLogo className="size-5" weight="fill" />
        </a>
      </div>
    </header>
  );
}
