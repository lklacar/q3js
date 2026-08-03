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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function integer(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isInteger(value) ? value : fallback;
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
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

function parseServer(value: unknown): ListedServer | undefined {
  if (!isRecord(value) || !isRecord(value.info)) {
    return undefined;
  }

  const host = text(value.host, "");
  const proxyPort = integer(value.proxyPort);
  if (!host || proxyPort < 1 || proxyPort > 65535) {
    return undefined;
  }

  const info = value.info;
  const rawName = text(info.sv_hostname, `${host}:${proxyPort}`);
  const ping = integer(info.ping);
  const gamename = text(info.gamename, "q3js").toLowerCase();
  return {
    id: `${host}:${proxyPort}`,
    host,
    proxyPort,
    secure: value.secure === true,
    game: gamename === "cpma" ? "cpma" : "q3js",
    name: stripQuakeColors(rawName) || `${host}:${proxyPort}`,
    map: text(info.mapname, "unknown"),
    mode: gameMode(integer(info.g_gametype)),
    players: Math.max(0, integer(info.players)),
    capacity: Math.max(0, integer(info.sv_maxclients)),
    ...(ping > 0 ? { ping } : {}),
  };
}

export async function fetchServers(signal?: AbortSignal): Promise<ListedServer[]> {
  const baseUrl = process.env.NEXT_PUBLIC_Q3JS_MASTER_URL?.trim() || "http://localhost:8080";
  const response = await fetch(new URL("/api/servers", baseUrl), {
    cache: "no-store",
    headers: { accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Master server returned HTTP ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("Master server returned an invalid server list");
  }
  return payload.map(parseServer).filter((server): server is ListedServer => server !== undefined);
}
