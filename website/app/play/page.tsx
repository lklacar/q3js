import type { Metadata } from "next";
import { PlayClient, type SelectedServer } from "@/components/play-client";

export const metadata: Metadata = {
  title: "Play — Q3JS",
  description: "Launch Quake III in your browser and connect to a Q3JS server.",
};

type SearchParameters = Record<string, string | string[] | undefined>;

function parameter(parameters: SearchParameters, name: string): string | undefined {
  const value = parameters[name];
  return Array.isArray(value) ? value[0] : value;
}

function selectedServer(parameters: SearchParameters): SelectedServer | undefined {
  const host = parameter(parameters, "host")?.trim();
  const proxyPort = Number.parseInt(parameter(parameters, "proxyPort") ?? "", 10);
  if (!host || !Number.isInteger(proxyPort) || proxyPort < 1 || proxyPort > 65535) {
    return undefined;
  }

  const requestedGame = parameter(parameters, "game")?.trim() || "q3js";
  const game = /^[A-Za-z0-9_-]+$/.test(requestedGame) ? requestedGame : "q3js";
  return {
    host,
    proxyPort,
    secure: parameter(parameters, "secure") === "1",
    game,
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
