import type { Metadata } from "next";
import { PlayClient, type SelectedServer } from "@/components/play-client";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Play Quake III Arena",
  description: "Join a Q3JS server and play Quake III Arena in your browser.",
  path: "/play",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
});

type SearchParameters = Record<string, string | string[] | undefined>;

function parameter(parameters: SearchParameters, name: string): string | undefined {
  const value = parameters[name];
  return Array.isArray(value) ? value[0] : value;
}

function identifier(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && /^[A-Za-z0-9_-]+$/.test(normalized) ? normalized : undefined;
}

function selectedServer(parameters: SearchParameters): SelectedServer | undefined {
  const host = parameter(parameters, "host")?.trim();
  const proxyPort = Number.parseInt(parameter(parameters, "proxyPort") ?? "", 10);
  const targetPort = Number.parseInt(parameter(parameters, "targetPort") ?? "27960", 10);
  const transport = parameter(parameters, "transport") === "webtransport"
    ? "webtransport"
    : "websocket";
  if (
    !host
    || !Number.isInteger(proxyPort)
    || proxyPort < 1
    || proxyPort > 65535
    || !Number.isInteger(targetPort)
    || targetPort < (transport === "webtransport" ? 1 : 0)
    || targetPort > 65535
  ) {
    return undefined;
  }

  const baseGame = identifier(parameter(parameters, "baseGame")) ?? "baseq3";
  const fsGame = identifier(parameter(parameters, "fsGame"));
  const comGameName = identifier(parameter(parameters, "comGameName"))
    ?? "Quake3Arena";
  return {
    host,
    proxyPort,
    targetPort,
    secure: !["0", "false"].includes(parameter(parameters, "secure") ?? "1"),
    transport,
    baseGame,
    fsGame,
    comGameName,
    name: parameter(parameters, "serverName")?.trim() || `${host}:${proxyPort}`,
  };
}

export default async function PlayPage({ searchParams }: { searchParams: Promise<SearchParameters> }) {
  const parameters = await searchParams;
  return (
    <main className="relative isolate h-dvh min-h-dvh w-screen overflow-hidden bg-black text-foreground">
      <PlayClient
        selectedServer={selectedServer(parameters)}
        initialPlayerName={parameter(parameters, "name")}
      />
    </main>
  );
}
