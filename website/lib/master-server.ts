import type { ServerResponse } from "@/lib/api/generated/types.gen";

export interface ListedPlayer {
  name: string;
  ping: number;
  score: number;
  bot: boolean;
}

export type ClientProfile = string;

export interface ListedServer {
  id: string;
  host: string;
  proxyPort: number;
  targetPort: number;
  secure: boolean;
  official: boolean;
  clientProfile: ClientProfile;
  fsGame: string | undefined;
  comGameName: string;
  name: string;
  coloredName: string;
  map: string;
  mode: string;
  limits: string;
  location: string;
  players: number;
  capacity: number;
  ping: number;
  passwordProtected: boolean;
  version: string;
  protocol: number;
  users: ListedPlayer[];
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

function gameLimits(server: ServerResponse): string {
  const limits: string[] = [];
  if (server.info.g_gametype === 4 && server.info.capturelimit > 0) {
    limits.push(`${server.info.capturelimit} captures`);
  }
  if (server.info.fraglimit > 0) {
    limits.push(`${server.info.fraglimit} frags`);
  }
  if (server.info.timelimit > 0) {
    limits.push(`${server.info.timelimit} minutes`);
  }
  return limits.join(" / ") || "No limit";
}

function mapServer(server: ServerResponse): ListedServer | undefined {
  const { host, info, proxyPort } = server;
  if (!host || !info || !proxyPort || proxyPort < 1 || proxyPort > 65535) {
    return undefined;
  }

  const fallbackName = `${host}:${proxyPort}`;
  const rawName = info.sv_hostname?.trim() || fallbackName;
  const fsGame = info.fs_game?.trim() || undefined;
  const gameNames = [fsGame, info.gamename, info.com_gamename]
    .map((value) => value?.trim().toLowerCase())
    .filter(Boolean);
  const advertisedProfile = gameNames.includes("cpma") ? "cpma" : fsGame;
  const clientProfile = advertisedProfile
    && !["baseq3", "q3js"].includes(advertisedProfile.toLowerCase())
    && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(advertisedProfile)
    ? advertisedProfile
    : "baseq3";
  const users = [...(info.users ?? [])]
    .sort((left, right) => right.score - left.score)
    .map((user) => ({
      name: user.name,
      ping: user.ping,
      score: user.score,
      bot: user.ping === 0,
    }));
  return {
    id: `${host}:${proxyPort}`,
    host,
    proxyPort,
    targetPort: server.targetPort,
    secure: server.secure ?? false,
    official: server.official ?? false,
    clientProfile,
    fsGame,
    comGameName: info.com_gamename?.trim() || "Quake3Arena",
    name: stripQuakeColors(rawName) || fallbackName,
    coloredName: rawName,
    map: info.mapname?.trim() || "unknown",
    mode: gameMode(info.g_gametype ?? 0),
    limits: gameLimits(server),
    location: info.location?.trim() || "Unknown",
    players: Math.max(0, info.players ?? 0),
    capacity: Math.max(0, info.sv_maxclients ?? 0),
    ping: Math.max(0, info.ping ?? 0),
    passwordProtected: info.g_needpass === 1,
    version: info.version?.trim() || "Unknown",
    protocol: info.com_protocol ?? 0,
    users,
  };
}

export function mapServers(servers: ReadonlyArray<ServerResponse>): ListedServer[] {
  return servers.map(mapServer).filter((server): server is ListedServer => server !== undefined);
}
