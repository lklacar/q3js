import {
    getGlobalScoreboard, getKillDistribution,
    KillDistributionPointResponse,
    ScoreboardEntryResponse,
    ScoreboardPeriod,
    ServerResponse
} from "@/lib/client";
import {getAllServers} from '@/lib/client/sdk.gen';

export async function getInitialServers(): Promise<ServerResponse[]> {
    const {data} = await getAllServers({
        throwOnError: true,
    });
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

export async function getInitialScoreboards(
    periods: readonly ScoreboardPeriod[],
): Promise<Record<ScoreboardPeriod, ScoreboardEntryResponse[]>> {
    const entries = await Promise.all(
        periods.map(async (period) => [period, await getInitialScoreboard(period)] as const),
    );

    return Object.fromEntries(entries) as Record<ScoreboardPeriod, ScoreboardEntryResponse[]>;
}

export async function getInitialKillDistributions(
    periods: readonly ScoreboardPeriod[],
): Promise<Record<ScoreboardPeriod, KillDistributionPointResponse[]>> {
    const entries = await Promise.all(
        periods.map(async (period) => [period, await getInitialKillDistribution(period)] as const),
    );

    return Object.fromEntries(entries) as Record<ScoreboardPeriod, KillDistributionPointResponse[]>;
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
