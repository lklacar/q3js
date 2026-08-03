import type { ServerResponse } from "@/lib/api/generated/types.gen";

export interface ListedServer {
  id: string;
  host: string;
  proxyPort: number;
  secure: boolean;
  game: string;
  name: string;
  map: string;
  mode: string;
  players: number;
  capacity: number;
  ping?: number;
}

function stripQuakeColors(value: string): string {
  return value.replace(/\^(?:[0-9]|x[0-9a-f]{6})/gi, "").trim();
}

function gameMode(value: number): string {
  switch (value) {
    case 0:
      return "Free for all";
    case 1:
      return "Tournament";
    case 2:
      return "Single player";
    case 3:
      return "Team deathmatch";
    case 4:
      return "Capture the flag";
    case 5:
      return "One flag CTF";
    case 6:
      return "Overload";
    case 7:
      return "Harvester";
    default:
      return `Game type ${value}`;
  }
}

function mapServer(server: ServerResponse): ListedServer | undefined {
  const { host, info, proxyPort } = server;
  if (!host || !info || !proxyPort || proxyPort < 1 || proxyPort > 65535) {
    return undefined;
  }

  const fallbackName = `${host}:${proxyPort}`;
  const rawName = info.sv_hostname?.trim() || fallbackName;
  const gamename = info.gamename?.trim().toLowerCase() || "q3js";
  return {
    id: `${host}:${proxyPort}`,
    host,
    proxyPort,
    secure: server.secure ?? false,
    game: gamename === "cpma" ? "cpma" : "q3js",
    name: stripQuakeColors(rawName) || fallbackName,
    map: info.mapname?.trim() || "unknown",
    mode: gameMode(info.g_gametype ?? 0),
    players: Math.max(0, info.players ?? 0),
    capacity: Math.max(0, info.sv_maxclients ?? 0),
    ...(info.ping && info.ping > 0 ? { ping: info.ping } : {}),
  };
}

export function mapServers(servers: ReadonlyArray<ServerResponse>): ListedServer[] {
  return servers.map(mapServer).filter((server): server is ListedServer => server !== undefined);
}
