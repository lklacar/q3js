"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Crosshair, Skull, Users } from "@phosphor-icons/react";
import { Q3ColoredText } from "@/components/q3-colored-text";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import type { SiteStatsResponse } from "@/lib/api/generated/types.gen";
import { masterStatsQueryOptions } from "@/lib/master-server-query";

function countLabel(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en").format(value);
}

function HomeStatsContent({ stats }: Readonly<{ stats: SiteStatsResponse }>) {
  const topFragger = stats.mostFragsLast24Hours;
  return (
    <dl className="mb-10 grid gap-3 sm:grid-cols-3">
      <div className="arena-card border border-border/60 bg-card/55 p-4">
        <dt className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
          <Users className="size-4 text-primary" /> Players online
        </dt>
        <dd className="mt-3 flex items-baseline gap-2 font-mono tabular-nums">
          <span className="text-2xl font-bold tracking-[0.03em]">{formatNumber(stats.playersOnline)}</span>
          <span className="text-sm text-muted-foreground">+ {countLabel(stats.botsOnline, "bot")}</span>
        </dd>
        <p className="mt-2 text-sm text-muted-foreground">Across live arenas.</p>
      </div>

      <div className="arena-card border border-border/60 bg-card/55 p-4">
        <dt className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
          <Crosshair className="size-4 text-primary" /> Most frags last 24 hours
        </dt>
        <dd className="mt-3 truncate font-mono text-xl font-bold tracking-[0.025em]">
          {topFragger ? (
            <Link href={`/players/${encodeURIComponent(topFragger.playerName)}`} className="hover:text-primary">
              <Q3ColoredText text={topFragger.playerName} />
            </Link>
          ) : "No frags yet"}
        </dd>
        <p className="mt-2 text-sm text-muted-foreground">
          {topFragger ? `${countLabel(topFragger.frags, "frag")} in the last 24 hours.` : "No frags recorded in the last 24 hours."}
        </p>
      </div>

      <div className="arena-card border border-border/60 bg-card/55 p-4">
        <dt className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
          <Skull className="size-4 text-primary" /> Total frags ever
        </dt>
        <dd className="mt-3 font-mono text-2xl font-bold tracking-[0.03em] tabular-nums">{formatNumber(stats.totalFragsEver)}</dd>
        <p className="mt-2 text-sm text-muted-foreground">Since Q3JS started keeping score.</p>
      </div>
    </dl>
  );
}

function HomeStatsQuery() {
  const { data: stats } = useSuspenseQuery(masterStatsQueryOptions());
  return <HomeStatsContent stats={stats} />;
}

function HomeStatsPending() {
  const pendingStats = [
    { label: "Players online", icon: Users, valueWidth: "w-12", detailWidth: "w-4/5" },
    { label: "Most frags last 24 hours", icon: Crosshair, valueWidth: "w-32", detailWidth: "w-24" },
    { label: "Total frags ever", icon: Skull, valueWidth: "w-20", detailWidth: "w-3/4" },
  ] as const;

  return (
    <div className="mb-10 grid gap-3 sm:grid-cols-3" aria-busy="true" aria-label="Loading Q3JS statistics">
      {pendingStats.map(({ label, icon: Icon, valueWidth, detailWidth }) => (
        <div key={label} className="arena-card border border-border/60 bg-card/55 p-4">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <Icon className="size-4 text-primary" /> {label}
          </div>
          <Skeleton className={`mt-3 h-7 ${valueWidth}`} />
          <Skeleton className={`mt-3 h-2 ${detailWidth} bg-muted/70`} />
        </div>
      ))}
    </div>
  );
}

export function HomeStats() {
  return (
    <QueryBoundary
      pendingFallback={<HomeStatsPending />}
      errorFallback={() => (
        <div className="mb-10 border border-border/60 bg-card/55 px-5 py-4 text-sm text-muted-foreground">
          Homepage statistics are temporarily unavailable.
        </div>
      )}
    >
      <HomeStatsQuery />
    </QueryBoundary>
  );
}
