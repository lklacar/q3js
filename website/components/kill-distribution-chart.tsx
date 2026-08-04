"use client";

import { useMemo, useState } from "react";
import type { KillDistributionPointResponse } from "@/lib/api/generated/types.gen";
import { cn } from "@/lib/utils";

type BucketUnit = "day" | "hour";

const densityRules = [
  { minimum: 365, labelStep: 90, columnWidth: 0.35, gap: "gap-px" },
  { minimum: 180, labelStep: 30, columnWidth: 0.45, gap: "gap-px" },
  { minimum: 90, labelStep: 14, columnWidth: 0.55, gap: "gap-px" },
  { minimum: 45, labelStep: 7, columnWidth: 0.75, gap: "gap-1" },
  { minimum: 21, labelStep: 3, columnWidth: 1.15, gap: "gap-1" },
  { minimum: 11, labelStep: 2, columnWidth: 2.2, gap: "gap-1" },
  { minimum: 0, labelStep: 1, columnWidth: 3, gap: "gap-2" },
] as const;

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en").format(value);
}

function formatLongDate(bucketStart: string, bucketUnit: BucketUnit, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: bucketUnit === "hour" ? "2-digit" : undefined,
    hourCycle: "h23",
    minute: bucketUnit === "hour" ? "2-digit" : undefined,
    month: "short",
    timeZone,
    year: "numeric",
  }).format(new Date(bucketStart));
}

function formatShortDate(bucketStart: string, bucketUnit: BucketUnit, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    day: bucketUnit === "day" ? "numeric" : undefined,
    hour: bucketUnit === "hour" ? "2-digit" : undefined,
    hourCycle: "h23",
    minute: bucketUnit === "hour" ? "2-digit" : undefined,
    month: bucketUnit === "day" ? "short" : undefined,
    timeZone,
  }).format(new Date(bucketStart));
}

function SummaryStat({
  detail,
  label,
  value,
}: Readonly<{ detail?: string; label: string; value: string }>) {
  return (
    <div className="border border-border/60 bg-background/35 px-4 py-3">
      <dt className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-2xl font-bold tracking-[0.025em] tabular-nums">{value}</dd>
      {detail && <dd className="mt-1 truncate text-xs text-muted-foreground">{detail}</dd>}
    </div>
  );
}

export function KillDistributionChart({
  bucketUnit,
  data,
  periodLabel,
  timeZone,
}: Readonly<{
  bucketUnit: BucketUnit;
  data: KillDistributionPointResponse[];
  periodLabel: string;
  timeZone: string;
}>) {
  const [selectedBucket, setSelectedBucket] = useState<string>();
  const summary = useMemo(() => {
    const totalKills = data.reduce((total, point) => total + point.kills, 0);
    const peak = data.reduce<KillDistributionPointResponse | undefined>(
      (current, point) => !current || point.kills > current.kills ? point : current,
      undefined,
    );
    return {
      average: data.length ? Math.round(totalKills / data.length) : 0,
      peak,
      totalKills,
    };
  }, [data]);
  const activePoint = data.find((point) => point.bucketStart === selectedBucket) ?? data.at(-1);
  const maxKills = Math.max(summary.peak?.kills ?? 0, 1);
  const density = densityRules.find((rule) => data.length >= rule.minimum) ?? densityRules.at(-1)!;
  const chartMinimumWidth = data.length > 14 ? `${data.length * density.columnWidth}rem` : undefined;
  const bucketLabel = bucketUnit === "hour" ? "hour" : "day";

  return (
    <section aria-labelledby="activity-chart-heading" className="border border-border/60 bg-card/45">
      <div className="grid gap-4 border-b border-border/60 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Recorded combat activity</p>
          <h2 id="activity-chart-heading" className="mt-2 font-mono text-2xl font-bold uppercase tracking-[0.035em]">
            Frag distribution
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {bucketUnit === "hour" ? "Hourly" : "Daily"} frag totals for {periodLabel.toLowerCase()}.
          </p>
        </div>

        {activePoint && (
          <div className="min-w-52 border-l-2 border-primary bg-background/45 px-4 py-3 md:text-right" aria-live="polite">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">Selected {bucketLabel}</p>
            <p className="mt-1 font-mono text-xl font-bold tabular-nums">{formatNumber(activePoint.kills)} frags</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatLongDate(activePoint.bucketStart, bucketUnit, timeZone)}
            </p>
          </div>
        )}
      </div>

      <dl className="grid gap-2 p-5 sm:grid-cols-3 md:p-6">
        <SummaryStat label="Total frags" value={formatNumber(summary.totalKills)} />
        <SummaryStat
          label={`Peak ${bucketLabel}`}
          value={formatNumber(summary.peak?.kills ?? 0)}
          detail={summary.peak ? formatLongDate(summary.peak.bucketStart, bucketUnit, timeZone) : "No activity yet"}
        />
        <SummaryStat
          label={`${bucketUnit === "hour" ? "Hourly" : "Daily"} average`}
          value={formatNumber(summary.average)}
          detail={`${formatNumber(data.length)} ${data.length === 1 ? bucketLabel : `${bucketLabel}s`} tracked`}
        />
      </dl>

      <div className="px-5 pb-5 md:px-6 md:pb-6">
        <div className="border border-border/60 bg-background/25 p-3">
          {data.length === 0 ? (
            <div className="grid h-72 place-items-center text-sm text-muted-foreground">
              No frag activity has been recorded for this period yet.
            </div>
          ) : (
            <div className="overflow-x-auto pb-2" onMouseLeave={() => setSelectedBucket(undefined)}>
              <div className="relative w-full" style={{ minWidth: chartMinimumWidth }}>
                <div className="pointer-events-none absolute inset-x-0 bottom-7 top-0 grid grid-rows-4" aria-hidden="true">
                  {[0, 1, 2, 3].map((line) => (
                    <div key={line} className="border-t border-dashed border-border/45 last:border-b" />
                  ))}
                </div>

                <div
                  className={cn("relative grid h-72 w-full items-end pt-3", density.gap)}
                  style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
                >
                  {data.map((point, index) => {
                    const height = (point.kills / maxKills) * 100;
                    const active = point.bucketStart === activePoint?.bucketStart;
                    const showLabel = active || index % density.labelStep === 0 || index === data.length - 1;
                    const longDate = formatLongDate(point.bucketStart, bucketUnit, timeZone);

                    return (
                      <button
                        key={point.bucketStart}
                        type="button"
                        className="group relative flex h-full min-w-0 flex-col justify-end gap-2 text-left outline-none hover:z-10 focus-visible:z-10"
                        aria-label={`${longDate}: ${point.kills} ${point.kills === 1 ? "frag" : "frags"}`}
                        onBlur={() => setSelectedBucket(undefined)}
                        onFocus={() => setSelectedBucket(point.bucketStart)}
                        onMouseEnter={() => setSelectedBucket(point.bucketStart)}
                      >
                        <span className="relative flex h-60 w-full items-end bg-background/20">
                          <span
                            className={cn(
                              "block w-full bg-primary/45 transition-colors duration-150 group-hover:bg-primary group-focus-visible:bg-primary",
                              active && "bg-primary",
                            )}
                            style={{ height: `${height}%`, minHeight: point.kills ? "4px" : "1px" }}
                          />
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap border border-primary/60 bg-background px-2 py-1 font-mono text-xs font-bold tabular-nums text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                            style={{ bottom: `min(calc(${height}% + 0.5rem), calc(100% - 2rem))` }}
                          >
                            {formatNumber(point.kills)} {point.kills === 1 ? "frag" : "frags"}
                          </span>
                        </span>
                        <span className={cn(
                          "min-h-3 whitespace-nowrap font-mono text-[10px] leading-none text-muted-foreground",
                          !showLabel && "opacity-0",
                          active && "text-foreground",
                        )}>
                          {showLabel ? formatShortDate(point.bucketStart, bucketUnit, timeZone) : "·"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          Times shown in {timeZone}. Hover or focus a bar for its exact total.
        </p>
      </div>
    </section>
  );
}
