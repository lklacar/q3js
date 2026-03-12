"use client";

import {Card, CardContent} from "@/components/ui/card.tsx";
import {Button} from "@/components/ui/button.tsx";
import Link from "next/link";
import {
    SCOREBOARD_PERIOD_LABELS
} from "@/lib/scoreboard.ts";
import {useMemo, useState} from "react";
import {stripQ3Colors} from "@/lib/utils.ts";
import {Q3ColoredText} from "@/components/q3-colored-text.tsx";
import {trackEvent} from "@/lib/analytics.ts";
import {ScoreboardPeriodToggle} from "@/components/scoreboard-period-toggle.tsx";
import {useSuspenseQuery} from "@tanstack/react-query";
import {getGlobalScoreboardOptions} from "@/lib/client/@tanstack/react-query.gen.ts";
import {ScoreboardEntryResponse, ScoreboardPeriod} from "@/lib/client";

function formatKills(kills: number) {
    return new Intl.NumberFormat().format(kills);
}

export function ScoreboardPreview(props: {
    initialScoreboard: ScoreboardEntryResponse[];
    initialPeriod?: ScoreboardPeriod;
}) {
    const initialPeriod = props.initialPeriod ?? "DAILY";
    const [period, setPeriod] = useState<ScoreboardPeriod>(initialPeriod);

    const scoreboardResponse = useSuspenseQuery({
        ...getGlobalScoreboardOptions({
            query: {
                period
            }
        })
    })

    const topFraggers = useMemo(() => {
        const rows = scoreboardResponse.data ?? [];
        return [...rows]
            .sort((a, b) => {
                if (b.kills !== a.kills) return b.kills - a.kills;
                return stripQ3Colors(a.playerName).localeCompare(stripQ3Colors(b.playerName));
            })
            .slice(0, 5);
    }, [scoreboardResponse.data]);

    function selectPeriod(nextPeriod: ScoreboardPeriod) {
        if (nextPeriod === period) return;

        trackEvent("scoreboard_period_change", {source: "scoreboard_preview", period: nextPeriod});
        setPeriod(nextPeriod);
    }

    const periodLabel = SCOREBOARD_PERIOD_LABELS[period].toLowerCase();

    return (
        <section className="container mx-auto px-4 pb-8">
            <div className="mx-auto max-w-5xl">
                <Card className="border-border/60 bg-card/60">
                    <CardContent className="p-4 md:p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">Top Fraggers <span
                                    className="text-sm font-normal text-muted-foreground">(click to see profile)</span>
                                </h2>
                                <p className="text-xs text-muted-foreground md:text-sm">
                                    Global {periodLabel} frag leaders.
                                </p>
                            </div>
                            <div className="flex flex-col items-start gap-2 md:items-end">
                                <ScoreboardPeriodToggle period={period} onChange={selectPeriod}/>
                            </div>
                        </div>

                        <div className="mt-4 border-t border-border/50">
                            {scoreboardResponse.isPending && (
                                <div className="divide-y divide-border/40">
                                    {Array.from({length: 5}).map((_, idx) => (
                                        <div key={idx}
                                             className="grid grid-cols-[56px_1fr_100px] items-center gap-3 px-2 py-3">
                                            <div className="h-4 w-8 animate-pulse bg-muted"/>
                                            <div className="h-4 w-2/5 animate-pulse bg-muted"/>
                                            <div className="ml-auto h-4 w-12 animate-pulse bg-muted"/>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {scoreboardResponse.isError && (
                                <div className="px-2 py-6 text-sm text-muted-foreground">
                                    {SCOREBOARD_PERIOD_LABELS[period]} scoreboard is temporarily unavailable.
                                </div>
                            )}

                            {!scoreboardResponse.isPending && !scoreboardResponse.isError && topFraggers.length === 0 && (
                                <div className="px-2 py-6 text-sm text-muted-foreground">
                                    No {periodLabel} frag events recorded yet.
                                </div>
                            )}

                            {!scoreboardResponse.isPending && !scoreboardResponse.isError && topFraggers.length > 0 && (
                                <div className="divide-y divide-border/40">
                                    {topFraggers.map((entry, index) => (
                                        <div
                                            key={`${entry.playerName}-${index}`}
                                            className="grid grid-cols-[56px_1fr_100px] items-center gap-3 px-2 py-3 text-sm"
                                        >
                                            <span className="text-muted-foreground">#{index + 1}</span>
                                            <Link
                                                href={`/players/${encodeURIComponent(entry.playerName)}`}
                                                className="font-semibold truncate hover:text-primary transition-colors"
                                            >
                                                <Q3ColoredText text={entry.playerName}/>
                                            </Link>
                                            <span className="text-right tabular-nums">
                                                {formatKills(entry.kills)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex justify-start border-t border-border/50 pt-4 md:justify-end">
                            <Button variant="outline" asChild>
                                <Link
                                    href="/scoreboard"
                                    onClick={() => trackEvent("cta_click", {
                                        target: "view_scoreboard",
                                        source: "scoreboard_preview"
                                    })}
                                >
                                    View full scoreboard
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}
