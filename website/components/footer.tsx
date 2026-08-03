export function Footer() {
  return (
    <footer className="mt-10 border-t border-border/70">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 text-xs text-muted-foreground md:grid-cols-[1fr_auto]">
        <p className="max-w-3xl leading-5">
          Q3JS is a non-commercial fan project. Quake III Arena trademarks belong to their
          respective owners. Only the officially released demo data is used; the engine is based
          on the GPL-licensed ioquake3 project.
        </p>
        <div className="flex gap-4 md:justify-end">
          <a href="https://github.com/lklacar/q3js" target="_blank" rel="noreferrer" className="hover:text-foreground">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
