import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 text-[11px] leading-5 text-muted-foreground md:grid-cols-[1fr_auto]">
        <p className="max-w-3xl">
          Q3JS is a non-commercial fan project using the officially released demo data and a
          GPL-licensed ioquake3 engine build. Not affiliated with id Software or ZeniMax.
        </p>
        <div className="flex flex-wrap content-start gap-x-4 md:justify-end">
          <Link href="/guide" className="hover:text-foreground">Run a server</Link>
          <a href="https://github.com/lklacar/q3js" target="_blank" rel="noreferrer" className="hover:text-foreground">
            Source
          </a>
          <a href="https://discord.gg/mKvM9su443" target="_blank" rel="noreferrer" className="hover:text-foreground">
            Discord
          </a>
        </div>
      </div>
    </footer>
  );
}
