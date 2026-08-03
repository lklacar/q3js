"use client";

import Link from "next/link";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Trophy } from "@phosphor-icons/react";
import { Q3ColoredText } from "@/components/q3-colored-text";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
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
    <section aria-labelledby="top-fraggers-heading" className="arena-card mb-10 border border-border/60 bg-card/35 p-5 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.16em] text-primary">01 / Global frag feed</p>
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-primary" />
            <h2 id="top-fraggers-heading" className="font-mono text-2xl font-bold uppercase tracking-[0.035em]">Top fraggers</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Global frag leaders for the selected period.</p>
        </div>
        <div className="flex flex-wrap gap-1 bg-background/35 p-1" aria-label="Top fragger period">
          {periods.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={cn(
                "px-3 py-2 text-xs text-muted-foreground hover:text-foreground",
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
              className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 py-3 text-sm"
            >
              <span className={cn(
                "font-mono text-xs text-muted-foreground",
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
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  Last online {formatRelativeTime(entry.lastOnline)}
                </p>
              </div>
              <span className="font-mono font-semibold tabular-nums">{fragLabel(entry.kills)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 py-5 text-sm text-muted-foreground">No frags recorded for this period yet.</p>
      )}

      <div className="mt-4 flex justify-end">
        <Link
          href={`/scoreboard?period=${activePeriod.query}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          View frag rankings <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}

function ScoreboardPreviewPending() {
  return (
    <section
      className="arena-card mb-10 border border-border/60 bg-card/35 p-5 md:p-6"
      aria-busy="true"
      aria-label="Loading top fraggers"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.16em] text-primary">01 / Global frag feed</p>
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-primary" />
            <h2 className="font-mono text-2xl font-bold uppercase tracking-[0.035em]">Top fraggers</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Global frag leaders for the selected period.</p>
        </div>
        <div className="flex flex-wrap gap-1 bg-background/35 p-1" aria-hidden="true">
          {periods.map((option, index) => (
            <button
              key={option.value}
              type="button"
              disabled
              className={cn(
                "px-3 py-2 text-xs text-muted-foreground",
                index === 0 && "bg-secondary text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <ol className="mt-5 divide-y divide-border/40" aria-hidden="true">
        {[1, 2, 3].map((rank) => (
          <li key={rank} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 py-3">
            <span className="font-mono text-xs font-bold text-primary">#{rank}</span>
            <div>
              <Skeleton className="h-3 w-28 max-w-[70%]" />
              <Skeleton className="mt-2 h-2 w-36 max-w-[85%] bg-muted/70" />
            </div>
            <Skeleton className="h-3 w-16" />
          </li>
        ))}
      </ol>

      <div className="mt-4 flex justify-end">
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          View frag rankings <ArrowRight className="size-3.5" />
        </span>
      </div>
    </section>
  );
}

export function ScoreboardPreview() {
  return (
    <QueryBoundary
      pendingFallback={<ScoreboardPreviewPending />}
      errorFallback={() => (
        <div className="mb-10 border border-border/60 bg-card/35 px-5 py-4 text-sm text-muted-foreground">
          Scoreboard preview is temporarily unavailable.
        </div>
      )}
    >
      <PreviewQuery />
    </QueryBoundary>
  );
}
