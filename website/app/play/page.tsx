import type { Metadata } from "next";
import { PlayClient, type SelectedServer } from "@/components/play-client";
import type { ClientProfile } from "@/lib/master-server";
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

function clientProfile(value: string | undefined): ClientProfile {
  return identifier(value) ?? "baseq3";
}

function selectedServer(parameters: SearchParameters): SelectedServer | undefined {
  const host = parameter(parameters, "host")?.trim();
  const proxyPort = Number.parseInt(parameter(parameters, "proxyPort") ?? "", 10);
  if (!host || !Number.isInteger(proxyPort) || proxyPort < 1 || proxyPort > 65535) {
    return undefined;
  }

  const requestedProfile = identifier(parameter(parameters, "clientProfile"));
  const profile = clientProfile(requestedProfile);
  const fsGame = identifier(parameter(parameters, "fsGame"));
  const comGameName = identifier(parameter(parameters, "comGameName"))
    ?? "Quake3Arena";
  return {
    host,
    proxyPort,
    secure: parameter(parameters, "secure") === "1",
    clientProfile: profile,
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
