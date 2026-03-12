import {getPlayerStats, PlayerStatsResponse, ScoreboardPeriod} from "@/lib/client";

export async function fetchPlayerStats(playerName: string, period: ScoreboardPeriod = "ALL_TIME") {
    const {data} = await getPlayerStats({
        path: {
            playerName,
        },
        query: {
            period,
        },
        throwOnError: true,
    });

    return data as PlayerStatsResponse;
}
