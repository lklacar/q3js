const adjectives = ["Atomic", "Bitter", "Fast", "Iron", "Quiet", "Red", "Sharp", "Void"];
const callsigns = ["Armor", "Gib", "Plasma", "Quad", "Rail", "Rocket", "Shard", "Strafe"];

export const PLAYER_NAME_STORAGE_KEY = "q3js.playerName";

export function randomPlayerName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const callsign = callsigns[Math.floor(Math.random() * callsigns.length)];
  return `${adjective}${callsign}${Math.floor(10 + Math.random() * 90)}`;
}
