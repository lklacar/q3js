"use client";

import Link from "next/link";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Trophy } from "@phosphor-icons/react";
import { Q3ColoredText } from "@/components/q3-colored-text";
import { QueryBoundary } from "@/components/query-boundary";
import type { ScoreboardPeriod } from "@/lib/api/generated/types.gen";
import { formatRelativeTime } from "@/lib/format";
import { scoreboardPreviewQueryOptions } from "@/lib/scoreboard-query";
import { cn } from "@/lib/utils";

const periods = [
  { value: "DAILY", query: "daily", label: "24 hours" },
  { value: "WEEKLY", query: "weekly", label: "Week" },
  { value: "MONTHLY", query: "monthly", label: "Month" },
  { value: "ALL_TIME", query: "all-time", label: "All time" },
] as const satisfies ReadonlyArray<{ value: ScoreboardPeriod; query: string; label: string }>;

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en").format(value);
}

function fragLabel(value: number): string {
  return `${formatNumber(value)} ${value === 1 ? "frag" : "frags"}`;
}

function PreviewQuery() {
  const [period, setPeriod] = useState<ScoreboardPeriod>("DAILY");
  const { data: scoreboard } = useSuspenseQuery(scoreboardPreviewQueryOptions(period));
  const activePeriod = periods.find((option) => option.value === period) ?? periods[0];

  return (
    <section aria-labelledby="top-fraggers-heading" className="mb-10 bg-card/35 p-5 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-primary" />
            <h2 id="top-fraggers-heading" className="text-xl font-bold">Top fraggers</h2>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Global frag leaders for the selected period.</p>
        </div>
        <div className="flex flex-wrap gap-1 bg-background/35 p-1" aria-label="Top fragger period">
          {periods.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={cn(
                "px-3 py-2 text-[10px] text-muted-foreground hover:text-foreground",
                period === option.value && "bg-secondary text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {scoreboard.entries.length ? (
        <ol className="mt-5 divide-y divide-border/40">
          {scoreboard.entries.map((entry, index) => (
            <li
              key={`${entry.playerName}-${index}`}
              className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 py-3 text-xs"
            >
              <span className={cn(
                "font-mono text-[10px] text-muted-foreground",
                index < 3 && "font-bold text-primary",
              )}>
                #{index + 1}
              </span>
              <div className="min-w-0">
                <Link
                  href={`/players/${encodeURIComponent(entry.playerName)}`}
                  className="block truncate font-semibold hover:text-primary"
                >
                  <Q3ColoredText text={entry.playerName} />
                </Link>
                <p className="mt-1 truncate text-[10px] text-muted-foreground">
                  Last online {formatRelativeTime(entry.lastOnline)}
                </p>
              </div>
              <span className="font-mono font-semibold tabular-nums">{fragLabel(entry.kills)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 py-5 text-xs text-muted-foreground">No frags recorded for this period yet.</p>
      )}

      <div className="mt-4 flex justify-end">
        <Link
          href={`/scoreboard?period=${activePeriod.query}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Full scoreboard <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}

function ScoreboardPreviewPending() {
  return (
    <section className="mb-10 h-72 animate-pulse bg-card/35 p-5" aria-label="Loading top fraggers">
      <span className="font-mono text-[9px] uppercase text-muted-foreground">Top fraggers</span>
    </section>
  );
}

export function ScoreboardPreview() {
  return (
    <QueryBoundary
      pendingFallback={<ScoreboardPreviewPending />}
      errorFallback={() => (
        <div className="mb-10 bg-card/35 px-5 py-4 text-xs text-muted-foreground">
          Scoreboard preview is temporarily unavailable.
        </div>
      )}
    >
      <PreviewQuery />
    </QueryBoundary>
  );
}
