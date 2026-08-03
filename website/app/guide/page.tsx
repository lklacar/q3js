import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Run a server — Q3JS",
  description: "Build, run, and publish a Q3JS game server.",
};

function Code({ children }: Readonly<{ children: string }>) {
  return (
    <pre className="max-w-full overflow-x-auto border border-border bg-card/40 p-4 text-xs leading-6 text-foreground">
      <code>{children}</code>
    </pre>
  );
}

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-12 md:py-16">
        <p className="text-[10px] uppercase tracking-[0.24em] text-primary">Server operator guide</p>
        <h1 className="mt-3 text-3xl font-black uppercase tracking-tight">Run your own arena</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
          The packaged Q3JS server always runs the dedicated game server and WebSocket gateway
          together. It also announces itself to the master automatically.
        </p>

        <div className="mt-10 grid gap-10 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:uppercase [&_p]:text-sm [&_p]:leading-6 [&_p]:text-muted-foreground [&_section]:min-w-0">
          <section>
            <h2>1. Build the server</h2>
            <p className="my-3">
              Clone the repository, install the workspace dependencies, and build from the project root.
            </p>
            <Code>{`pnpm install\nmake server`}</Code>
          </section>

          <section>
            <h2>2. Provide game data</h2>
            <p className="my-3">
              Point Q3JS at a directory containing your legally obtained <code>baseq3</code> data.
              The official demo data is sufficient for the demo maps.
            </p>
            <Code>{`Q3JS_BASEPATH=/path/containing/baseq3 make server-run`}</Code>
          </section>

          <section>
            <h2>3. Publish the right address</h2>
            <p className="my-3">
              For a public server, set the browser-reachable hostname. Use secure WebSockets when
              the website is served over HTTPS.
            </p>
            <Code>{`Q3JS_PUBLISH_HOST=quake.example.com \\\nQ3JS_PUBLISH_PORT=27961 \\\nQ3JS_SECURE=true \\\nQ3JS_MASTER_URL=https://master.q3js.com \\\nmake server-run`}</Code>
          </section>

          <section>
            <h2>4. Open the ports</h2>
            <div className="mt-3 grid gap-px border border-border bg-border sm:grid-cols-2">
              <div className="bg-background p-4">
                <p className="font-bold text-foreground">27960 / UDP</p>
                <p className="mt-1">Native Quake III traffic and the gateway target.</p>
              </div>
              <div className="bg-background p-4">
                <p className="font-bold text-foreground">27961 / TCP</p>
                <p className="mt-1">Browser WebSocket connections and the health endpoint.</p>
              </div>
            </div>
          </section>

          <section>
            <h2>5. Verify it</h2>
            <p className="mt-3">
              Open <code>/healthz</code> on the gateway, then check the Q3JS server browser. A healthy
              server sends a master heartbeat every five seconds and should appear shortly afterward.
            </p>
          </section>
        </div>

        <div className="mt-12 border-l-2 border-primary pl-4 text-xs leading-5 text-muted-foreground">
          Need every runtime option? Read the{" "}
          <Link
            href="https://github.com/lklacar/q3js/blob/develop/game/server/README.md"
            target="_blank"
            className="text-foreground underline underline-offset-4"
          >
            server README
          </Link>.
        </div>
      </main>
      <Footer />
    </div>
  );
}
