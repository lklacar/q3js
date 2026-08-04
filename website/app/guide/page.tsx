import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { SiteHeader } from "@/components/site-header";
import { absoluteUrl, buildPageMetadata, siteConfig } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Run Your Own Q3JS Server",
  description:
    "Run your own Q3JS Quake III server with Docker, add your baseq3 files, expose the required ports, and make it available to browser players.",
  path: "/guide",
  keywords: [
    "Q3JS server setup",
    "Quake 3 dedicated server",
    "Quake 3 Docker server",
    "run Quake 3 server",
    "WebSocket Quake 3 server",
    "Q3JS guide",
  ],
});

const guideStructuredData = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Run Your Own Q3JS Server",
  description:
    "Step-by-step guide to run a Q3JS Quake III server with Docker, the required ports, and your own baseq3 data.",
  inLanguage: siteConfig.language,
  url: absoluteUrl("/guide"),
  totalTime: "PT10M",
  tool: [{ "@type": "HowToTool", name: "Docker" }],
  supply: [{ "@type": "HowToSupply", name: "baseq3 directory with permitted game files" }],
  step: [
    {
      "@type": "HowToStep",
      name: "Create a server folder",
      text: "Create a directory with a baseq3 folder for your server game data and configuration.",
    },
    {
      "@type": "HowToStep",
      name: "Add your baseq3 files",
      text: "Add Quake III demo data or community-created files that you are permitted to host.",
    },
    {
      "@type": "HowToStep",
      name: "Start the Docker container",
      text: "Run the lukaklacar/q3js-server image with UDP 27960 and TCP 27961 exposed and mount baseq3 into /server/baseq3.",
    },
    {
      "@type": "HowToStep",
      name: "Open the required ports",
      text: "Forward UDP 27960 and TCP 27961 to the machine running the container.",
    },
    {
      "@type": "HowToStep",
      name: "Confirm the server is reachable",
      text: "Confirm that the server appears in the Q3JS server browser and accepts player connections.",
    },
  ],
  publisher: {
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
  },
} satisfies Record<string, unknown>;

function Code({ children }: Readonly<{ children: string }>) {
  return (
    <pre className="max-w-full overflow-x-auto border border-border bg-card/50 p-4 font-mono text-sm leading-6 text-foreground">
      <code>{children}</code>
    </pre>
  );
}

function Step({
  children,
  number,
  title,
}: Readonly<{
  children: React.ReactNode;
  number: string;
  title: string;
}>) {
  return (
    <section className="grid min-w-0 gap-3 md:grid-cols-[3rem_minmax(0,1fr)] md:gap-5">
      <span className="font-mono text-sm font-bold text-primary" aria-hidden="true">
        {number}
      </span>
      <div className="min-w-0">
        <h2 className="font-mono text-xl font-bold uppercase tracking-[0.03em] md:text-2xl">{title}</h2>
        <div className="mt-4 space-y-4 text-base leading-7 text-muted-foreground [&_code]:font-mono [&_code]:text-sm [&_code]:text-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
          {children}
        </div>
      </div>
    </section>
  );
}

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <JsonLd data={guideStructuredData} />
      <SiteHeader />

      <main className="mx-auto w-full max-w-4xl px-4 py-12 md:py-16">
        <header className="pb-6">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
            Field manual / Server operators
          </p>
          <h1 className="mt-3 max-w-3xl font-mono text-3xl font-black uppercase tracking-[0.035em] md:text-4xl">
            Run your own Q3JS server
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Q3JS can list and connect to standard Quake III dedicated servers. The simplest setup uses
            the official Docker image, which starts an <code className="font-mono text-sm text-foreground">ioq3ded</code>-compatible
            server and the WebSocket proxy required by browser players.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="bg-card/50 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">You need</p>
              <p className="mt-1 font-semibold">Docker</p>
            </div>
            <div className="bg-card/50 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">Game data</p>
              <p className="mt-1 font-semibold">A permitted baseq3 folder</p>
            </div>
            <div className="bg-card/50 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">Setup time</p>
              <p className="mt-1 font-semibold">About 10 minutes</p>
            </div>
          </div>
        </header>

        <div className="grid gap-10 pt-10">
          <Step number="01" title="Create a server folder">
            <p>
              Start with an empty directory for your server files. You will place a <code>baseq3</code> folder
              inside it in the next step.
            </p>
            <Code>{`mkdir my-q3-server\ncd my-q3-server`}</Code>
          </Step>

          <Step number="02" title="Add your baseq3 files">
            <p>
              Copy a <code>baseq3</code> directory into <code>my-q3-server</code>. This folder contains the game
              assets, configs, and maps the server will load.
            </p>
            <p>
              Use only files you are allowed to host, such as the Quake III demo data or community-created
              content. Do not host or redistribute retail game files.
            </p>
          </Step>

          <Step number="03" title="Start the container">
            <p>From inside <code>my-q3-server</code>, run:</p>
            <Code>{`docker run \\
  -p 27961:27961 \\
  -p 27960:27960/udp \\
  -v "$(pwd)/baseq3":/server/baseq3 \\
  lukaklacar/q3js-server \\
  +map q3dm17`}</Code>
          </Step>

          <Step number="04" title="Open the required ports">
            <p>
              To make the server reachable outside your local network, forward both ports on your router to
              the machine running the container.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="bg-card/50 p-4">
                <p className="font-mono font-bold text-foreground">27960 / UDP</p>
                <p className="mt-1 text-sm leading-6">Normal Quake III game traffic.</p>
              </div>
              <div className="bg-card/50 p-4">
                <p className="font-mono font-bold text-foreground">27961 / TCP</p>
                <p className="mt-1 text-sm leading-6">The WebSocket proxy used by browser clients.</p>
              </div>
            </div>
            <p>
              If these ports are not open, the server may work on your LAN but will not be visible or joinable
              from the public internet.
            </p>
          </Step>

          <Step number="05" title="How the Docker command works">
            <ul className="grid list-disc gap-3 pl-5 marker:text-primary">
              <li>
                <strong>Ports:</strong> <code>-p 27960:27960/udp</code> exposes the Quake III server, while <code>-p 27961:27961</code> exposes
                the Q3JS proxy.
              </li>
              <li>
                <strong>Volume mount:</strong> <code>-v &quot;$(pwd)/baseq3&quot;:/server/baseq3</code> mounts your local game data into the
                container.
              </li>
              <li>
                <strong>Dedicated server behavior:</strong> the container accepts standard <code>ioq3ded</code> <code>+set</code> and <code>+map</code> arguments.
              </li>
              <li>
                <strong>Map loading:</strong> the example starts on <code>q3dm17</code>. Replace it with any map present in your data files.
              </li>
            </ul>
          </Step>

          <Step number="06" title="Confirm the server is reachable">
            <p>
              After the container starts, your server should appear on the Q3JS home page. The Docker image
              already includes the correct master server settings.
            </p>
            <p>
              If it does not appear, check for missing files, an incorrectly mounted <code>baseq3</code> directory,
              or closed ports.
            </p>
          </Step>

          <Step number="07" title="File requirements">
            <p>
              Only official Quake III <em>demo</em> files or community-created assets may be hosted. Retail files
              are not included and cannot be distributed.
            </p>
          </Step>
        </div>

        <div className="mt-12 border-l-2 border-primary pl-4 text-sm leading-6 text-muted-foreground">
          Need lower-level runtime and build options? Read the{" "}
          <Link
            href="https://github.com/lklacar/q3js/blob/develop/game/server/README.md"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline underline-offset-4 hover:text-primary"
          >
            server README
          </Link>.
        </div>
      </main>

      <Footer />
    </div>
  );
}
