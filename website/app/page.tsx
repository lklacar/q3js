import { Footer } from "@/components/footer";
import { ScoreboardPreview } from "@/components/scoreboard-preview";
import { ServerBrowser } from "@/components/server-browser";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-4 py-10 md:py-14">
        <div className="mb-8 border-l-2 border-primary pl-4">
          <h1 className="text-xl font-bold uppercase tracking-tight md:text-2xl">
            Quake III in your browser
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Choose a live server and join the match. Q3JS uses the official demo data
            and an ioquake3 WebAssembly build.
          </p>
          <Button asChild size="lg" className="mt-4">
            <Link href="/play">Play on the local server</Link>
          </Button>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <ServerBrowser servers={[]} />
          <ScoreboardPreview entries={[]} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
