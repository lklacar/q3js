export const JEDI_ACADEMY_URL = "https://jk.q3js.com";
export const LOCAL_STORAGE_SYNC_EVENT = "q3js-local-storage-sync";
export const PLAYER_NAME_STORAGE_KEY = "name";

export function buildJediAcademyUrl(playerName: string) {
    const url = new URL(JEDI_ACADEMY_URL);
    const normalizedName = playerName.trim();

    if (normalizedName.length > 0) {
        url.searchParams.set("name", normalizedName);
    }

    return url.toString();
}
