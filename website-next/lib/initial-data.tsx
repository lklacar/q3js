import {
    getGlobalScoreboard, getKillDistribution,
    KillDistributionPointResponse,
    ScoreboardEntryResponse,
    ScoreboardPeriod,
    ServerResponse
} from "@/lib/client";
import {getAllServers} from '@/lib/client/sdk.gen';

export async function getInitialServers(): Promise<ServerResponse[]> {
    const {data} = await getAllServers({throwOnError: true});
    return data;
}

export async function getInitialScoreboard(period: ScoreboardPeriod = "DAILY"): Promise<ScoreboardEntryResponse[]> {
    const {data} = await getGlobalScoreboard({
        query: {
            period
        },
        throwOnError: true
    })
    return data;
}

export async function getInitialKillDistribution(
    period: ScoreboardPeriod = "DAILY"
): Promise<KillDistributionPointResponse[]> {
    const {data} = await getKillDistribution({
        query: {
            period,
        },
        throwOnError: true
    })
    return data;
}