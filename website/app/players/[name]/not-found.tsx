import Link from "next/link";
import { Footer } from "@/components/footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export default function PlayerNotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto grid min-h-[60vh] w-full max-w-5xl place-items-center px-4 py-16 text-center">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-primary">404 · Player not found</p>
          <h1 className="mt-3 text-2xl font-bold">No reported events for that player.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            The handle may be misspelled, or the player has not joined a server that reports stats yet.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/#servers">Return to servers</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
