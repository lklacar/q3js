import { Footer } from "@/components/footer";
import { ServerBrowser } from "@/components/server-browser";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 md:pt-14">
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Quake III Arena in your browser</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Choose a server and join. Q3JS runs the official Quake III demo through an ioquake3
            WebAssembly build.
          </p>
        </div>
        <ServerBrowser />
      </main>

      <Footer />
    </div>
  );
}
