"use client";

import {Button} from "@/components/ui/button.tsx";
import {
    SCOREBOARD_PERIOD_LABELS,
} from "@/lib/scoreboard.ts";
import {cn} from "@/lib/utils.ts";
import {ScoreboardPeriod} from "@/lib/client";

type ScoreboardPeriodToggleProps = {
    period: ScoreboardPeriod;
    onChange: (period: ScoreboardPeriod) => void;
};

export function ScoreboardPeriodToggle({period, onChange}: ScoreboardPeriodToggleProps) {
    return (
        <div
            className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-border/60 bg-background/70 p-1">
            {Object.keys(ScoreboardPeriod).map((value) => (
                <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={period === value ? "secondary" : "ghost"}
                    className={cn("min-w-20", period === value && "shadow-none")}
                    aria-pressed={period === value}
                    onClick={() => onChange(value as ScoreboardPeriod)}
                >
                    {SCOREBOARD_PERIOD_LABELS[value as ScoreboardPeriod]}
                </Button>
            ))}
        </div>
    );
}
