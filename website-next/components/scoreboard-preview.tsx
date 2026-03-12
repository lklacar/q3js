"use client";

import {Card, CardContent} from "@/components/ui/card.tsx";
import {Button} from "@/components/ui/button.tsx";
import Link from "next/link";
import {
    SCOREBOARD_PERIOD_LABELS
} from "@/lib/scoreboard.ts";
import {useMemo, useState} from "react";
import {Q3ColoredText} from "@/components/q3-colored-text.tsx";
import {ScoreboardPeriodToggle} from "@/components/scoreboard-period-toggle.tsx";
import {ScoreboardEntryResponse, ScoreboardPeriod} from "@/lib/client";
import {sortScoreboardEntries} from "@/lib/scoreboard";

function formatKills(kills: number) {
    return new Intl.NumberFormat().format(kills);
}

export function ScoreboardPreview(props: {
    scoreboards: Record<ScoreboardPeriod, ScoreboardEntryResponse[]>;
    initialPeriod?: ScoreboardPeriod;
}) {
    const initialPeriod = props.initialPeriod ?? "DAILY";
    const [period, setPeriod] = useState<ScoreboardPeriod>(initialPeriod);

    const topFraggers = useMemo(() => {
        const rows = props.scoreboards[period] ?? [];
        return sortScoreboardEntries(rows)
            .slice(0, 5);
    }, [period, props.scoreboards]);

    function selectPeriod(nextPeriod: ScoreboardPeriod) {
        if (nextPeriod === period) return;
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
                            {topFraggers.length === 0 && (
                                <div className="px-2 py-6 text-sm text-muted-foreground">
                                    No {periodLabel} frag events recorded yet.
                                </div>
                            )}

                            {topFraggers.length > 0 && (
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
                                <Link href="/scoreboard">
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
