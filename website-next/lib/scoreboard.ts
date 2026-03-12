import {ScoreboardEntryResponse, ScoreboardPeriod} from "@/lib/client";
import {stripQ3Colors} from "@/lib/utils";

export const SCOREBOARD_PERIODS = Object.values(ScoreboardPeriod) as ScoreboardPeriod[];

export const SCOREBOARD_PERIOD_LABELS: Record<ScoreboardPeriod, string> = {
    DAILY: "Last 24 Hours",
    WEEKLY: "Weekly",
    MONTHLY: "Monthly",
    ALL_TIME: "All Time",
};

export function sortScoreboardEntries(entries: ScoreboardEntryResponse[]) {
    return [...entries].sort((a, b) => {
        if (b.kills !== a.kills) return b.kills - a.kills;
        return stripQ3Colors(a.playerName).localeCompare(stripQ3Colors(b.playerName));
    });
}
