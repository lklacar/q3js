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

function boundedValue(value: string | undefined, fallback: string): string {
  const normalized = value?.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 100);
  return normalized || fallback;
}

function selectedServer(parameters: SearchParameters): SelectedServer | undefined {
  const host = parameter(parameters, "host")?.trim();
  const proxyPort = Number.parseInt(parameter(parameters, "proxyPort") ?? "", 10);
  if (!host || !Number.isInteger(proxyPort) || proxyPort < 1 || proxyPort > 65535) {
    return undefined;
  }

  const baseGame = identifier(parameter(parameters, "baseGame")) ?? "baseq3";
  const fsGame = identifier(parameter(parameters, "fsGame"));
  const comGameName = identifier(parameter(parameters, "comGameName"))
    ?? "Quake3Arena";
  const humanPlayers = Number.parseInt(parameter(parameters, "humanPlayers") ?? "0", 10);
  return {
    id: `${host}:${proxyPort}`,
    host,
    proxyPort,
    secure: parameter(parameters, "secure") === "1",
    baseGame,
    fsGame,
    comGameName,
    name: boundedValue(parameter(parameters, "serverName"), `${host}:${proxyPort}`),
    mode: boundedValue(parameter(parameters, "serverMode"), "unknown"),
    map: boundedValue(parameter(parameters, "serverMap"), "unknown"),
    official: parameter(parameters, "official") === "1",
    humanPlayers: Number.isFinite(humanPlayers) ? Math.max(0, Math.min(128, humanPlayers)) : 0,
    entryPoint: identifier(parameter(parameters, "entryPoint")),
    handoffId: identifier(parameter(parameters, "handoffId")),
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
