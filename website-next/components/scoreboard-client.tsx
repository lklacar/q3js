"use client";

import {Card, CardContent} from "@/components/ui/card.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import Link from "next/link";
import {
    SCOREBOARD_PERIOD_LABELS,
    sortScoreboardEntries,
} from "@/lib/scoreboard.ts";
import {useMemo, useState, useTransition} from "react";
import {Q3ColoredText} from "@/components/q3-colored-text.tsx";
import {ScoreboardPeriodToggle} from "@/components/scoreboard-period-toggle.tsx";
import {KillDistributionChart} from "@/components/kill-distribution-chart.tsx";
import {KillDistributionPointResponse, ScoreboardEntryResponse, ScoreboardPeriod} from "@/lib/client";
import {useRouter} from "next/navigation";

function rankBadge(rank: number) {
    if (rank === 1) return <Badge className="min-w-10 justify-center bg-primary text-primary-foreground">#1</Badge>;
    if (rank === 2) return <Badge variant="secondary" className="min-w-10 justify-center">#2</Badge>;
    if (rank === 3) return <Badge variant="outline" className="min-w-10 justify-center">#3</Badge>;
    return <span className="inline-block min-w-10 text-center text-muted-foreground">#{rank}</span>;
}

function formatKills(kills: number) {
    return new Intl.NumberFormat().format(kills);
}

export function ScoreboardClient(props: {
    killDistributions: Record<ScoreboardPeriod, KillDistributionPointResponse[]>;
    scoreboards: Record<ScoreboardPeriod, ScoreboardEntryResponse[]>;
    initialPeriod?: ScoreboardPeriod;
}) {
    const [period, setPeriod] = useState<ScoreboardPeriod>(props.initialPeriod ?? "DAILY");
    const [isRefreshing, startRefreshTransition] = useTransition();
    const router = useRouter();

    const scoreboard = useMemo(() => {
        const rows = props.scoreboards[period] ?? [];
        return sortScoreboardEntries(rows);
    }, [period, props.scoreboards]);

    const distribution = props.killDistributions[period] ?? [];

    function refreshScoreboard() {
        startRefreshTransition(() => {
            router.refresh();
        });
    }

    function selectPeriod(nextPeriod: ScoreboardPeriod) {
        if (nextPeriod === period) return;
        setPeriod(nextPeriod);
    }

    const periodLabel = SCOREBOARD_PERIOD_LABELS[period];

    return (
        <Card className="border-border/60 bg-card/60">
            <CardContent className="p-0">
                <div className="flex flex-col gap-3 border-b border-border/60 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {`${scoreboard.length} players ranked`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Showing {periodLabel.toLowerCase()} frags across reported servers.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <ScoreboardPeriodToggle period={period} onChange={selectPeriod}/>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={refreshScoreboard}
                                disabled={isRefreshing}
                            >
                                {isRefreshing ? "Refreshing..." : "Refresh"}
                            </Button>
                        </div>
                    </div>
                </div>

                <KillDistributionChart
                    bucketUnit={period === "DAILY" ? "hour" : "day"}
                    data={distribution}
                    isError={false}
                    isPending={false}
                    periodLabel={periodLabel}
                />

                {scoreboard.length === 0 && (
                    <div className="p-10 text-center">
                        <p className="text-sm text-muted-foreground">No {periodLabel.toLowerCase()} frag events have
                            been recorded yet.</p>
                        </div>
                )}

                {scoreboard.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[500px] text-sm">
                            <thead>
                            <tr className="border-b border-border/60 text-muted-foreground">
                                <th className="px-4 py-3 text-left font-semibold">Rank</th>
                                <th className="px-4 py-3 text-left font-semibold">Player</th>
                                <th className="px-4 py-3 text-right font-semibold">Frags</th>
                            </tr>
                            </thead>
                            <tbody>
                            {scoreboard.map((entry, index) => {
                                const rank = index + 1;

                                return (
                                    <tr key={`${entry.playerName}-${rank}`}
                                        className="border-b border-border/40 last:border-b-0">
                                        <td className="px-4 py-3">{rankBadge(rank)}</td>
                                        <td className="px-4 py-3 font-semibold">
                                            <Link
                                                href={`/players/${encodeURIComponent(entry.playerName)}`}
                                                className="inline-flex hover:text-primary transition-colors"
                                            >
                                                <Q3ColoredText text={entry.playerName}/>
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">
                                            {formatKills(entry.kills)}
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
