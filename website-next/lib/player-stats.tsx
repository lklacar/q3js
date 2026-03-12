import {env} from "@/env.ts";
import {PlayerStatsResponse, ScoreboardPeriod} from "@/lib/client";

export async function fetchPlayerStats(playerName: string, period: ScoreboardPeriod = "ALL_TIME") {
    const url = new URL(`/api/events/players/${encodeURIComponent(playerName)}`, env.NEXT_PUBLIC_MASTER_SERVER_URL);
    url.searchParams.set("period", period);

    const response = await fetch(url, {
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Failed to load player stats (${response.status})`);
    }

    return await response.json() as Promise<PlayerStatsResponse>;
}