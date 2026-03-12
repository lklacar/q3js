"use client";

import {useMemo, useState} from "react";
import {cn} from "@/lib/utils.ts";
import {KillDistributionPointResponse} from "@/lib/client";

function formatKills(kills: number) {
    return new Intl.NumberFormat().format(kills);
}

type BucketUnit = "day" | "hour";

function toUtcDate(bucketStart: string, bucketUnit: BucketUnit) {
    return new Date(bucketUnit === "hour" ? bucketStart : `${bucketStart}T00:00:00Z`);
}

function formatLongDate(bucketStart: string, bucketUnit: BucketUnit) {
    return toUtcDate(bucketStart, bucketUnit).toLocaleString("en-US", {
        day: "numeric",
        hour: bucketUnit === "hour" ? "numeric" : undefined,
        minute: bucketUnit === "hour" ? "2-digit" : undefined,
        month: "short",
        timeZone: "UTC",
        year: "numeric",
    });
}

function formatShortDate(bucketStart: string, bucketUnit: BucketUnit) {
    return toUtcDate(bucketStart, bucketUnit).toLocaleString("en-US", {
        day: bucketUnit === "day" ? "numeric" : undefined,
        hour: bucketUnit === "hour" ? "2-digit" : undefined,
        hour12: false,
        month: bucketUnit === "day" ? "short" : undefined,
        minute: bucketUnit === "hour" ? "2-digit" : undefined,
        timeZone: "UTC",
    });
}

export function KillDistributionChart(props: {
    bucketUnit: BucketUnit;
    data: KillDistributionPointResponse[];
    isError: boolean;
    isPending: boolean;
    periodLabel: string;
}) {
    const [hoveredBucketStart, setHoveredBucketStart] = useState<string | null>(null);
    const bucketCount = props.data.length;
    const labelStep = bucketCount > 120 ? 21 : bucketCount > 90 ? 14 : bucketCount > 45 ? 7 : bucketCount > 20 ? 3 : bucketCount > 10 ? 2 : 1;
    const minColumnWidthRem = bucketCount > 120 ? 0.5 : bucketCount > 90 ? 0.65 : bucketCount > 45 ? 0.85 : bucketCount > 20 ? 1.25 : 2.75;
    const chartMinWidth = bucketCount > 14 ? `${bucketCount * minColumnWidthRem}rem` : undefined;

    const summary = useMemo(() => {
        const totalKills = props.data.reduce((sum, point) => sum + point.kills, 0);
        const peakDay = props.data.reduce<KillDistributionPointResponse | null>((peak, point) => {
            if (peak === null || point.kills > peak.kills) return point;
            return peak;
        }, null);

        return {
            averageKills: props.data.length > 0 ? Math.round(totalKills / props.data.length) : 0,
            maxKills: peakDay?.kills ?? 0,
            peakDay,
            totalKills,
        };
    }, [props.data]);

    const activePoint = useMemo(() => {
        if (props.data.length === 0) return null;
        return props.data.find((point) => point.bucketStart === hoveredBucketStart) ?? props.data.at(-1) ?? null;
    }, [hoveredBucketStart, props.data]);

    const maxKills = Math.max(summary.maxKills, 1);

    return (
        <div className="border-b border-border/60 bg-card px-4 py-5">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div className="space-y-1">
                            <h2 className="text-xl font-semibold tracking-tight">Frag Distribution</h2>
                            <p className="text-sm text-muted-foreground">
                                {props.bucketUnit === "hour" ? "Hourly" : "Daily"} frag totals for the {props.periodLabel.toLowerCase()} window.
                            </p>
                        </div>

                    {activePoint && (
                        <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-right shadow-sm">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                Selected {props.bucketUnit}
                            </p>
                            <p className="text-lg font-semibold tabular-nums">{formatKills(activePoint.kills)} frags</p>
                            <p className="text-xs text-muted-foreground">
                                {formatLongDate(activePoint.bucketStart, props.bucketUnit)}
                            </p>
                        </div>
                    )}
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Total</p>
                        <p className="text-2xl font-semibold tabular-nums">{formatKills(summary.totalKills)}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Peak {props.bucketUnit}
                        </p>
                        <p className="text-2xl font-semibold tabular-nums">
                            {summary.peakDay ? formatKills(summary.peakDay.kills) : "0"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {summary.peakDay ? formatLongDate(summary.peakDay.bucketStart, props.bucketUnit) : "No data yet"}
                        </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            {props.bucketUnit === "hour" ? "Hourly" : "Daily"} average
                        </p>
                        <p className="text-2xl font-semibold tabular-nums">{formatKills(summary.averageKills)}</p>
                        <p className="text-xs text-muted-foreground">
                            {props.data.length > 0
                                ? `${props.data.length} tracked ${props.bucketUnit === "hour" ? "hours" : "days"}`
                                : "Waiting for events"}
                        </p>
                    </div>
                </div>

                <div className="rounded-lg border border-border/60 bg-background/45 p-3 shadow-sm">
                    {props.isPending && (
                        <div className="grid h-64 grid-cols-12 items-end gap-2">
                            {Array.from({length: 12}).map((_, index) => (
                                <div
                                    key={index}
                                    className="animate-pulse bg-muted"
                                    style={{height: `${35 + ((index * 17) % 55)}%`}}
                                />
                            ))}
                        </div>
                    )}

                    {!props.isPending && props.isError && (
                        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                            Frag distribution is temporarily unavailable.
                        </div>
                    )}

                    {!props.isPending && !props.isError && props.data.length === 0 && (
                        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                            No {props.bucketUnit === "hour" ? "hourly" : "daily"} frag data has been recorded for this period yet.
                        </div>
                    )}

                    {!props.isPending && !props.isError && props.data.length > 0 && (
                        <div className="overflow-x-auto pb-1" onMouseLeave={() => setHoveredBucketStart(null)}>
                            <div
                                className="relative w-full"
                                style={{minWidth: chartMinWidth}}
                            >
                                <div className="pointer-events-none absolute inset-x-0 top-0 bottom-8 grid grid-rows-4">
                                    {Array.from({length: 4}).map((_, index) => (
                                        <div
                                            key={index}
                                            className={cn(
                                                "border-t border-dashed border-border/45",
                                                index === 3 && "border-b"
                                            )}
                                        />
                                    ))}
                                </div>

                                <div
                                    className={cn(
                                        "relative grid h-64 w-full items-end pt-3",
                                        bucketCount > 45 ? "gap-px" : bucketCount > 20 ? "gap-1" : "gap-2"
                                    )}
                                    style={{gridTemplateColumns: `repeat(${props.data.length}, minmax(0, 1fr))`}}
                                >
                                    {props.data.map((point, index) => {
                                        const height = Math.max((point.kills / maxKills) * 100, point.kills > 0 ? 8 : 2);
                                        const isActive = point.bucketStart === activePoint?.bucketStart;
                                        const showLabel = index % labelStep === 0 || index === bucketCount - 1 || isActive;

                                        return (
                                            <button
                                                key={point.bucketStart}
                                                type="button"
                                                className="group flex h-full min-w-0 flex-col justify-end gap-2 text-left outline-none"
                                                onBlur={() => setHoveredBucketStart(null)}
                                                onFocus={() => setHoveredBucketStart(point.bucketStart)}
                                                onMouseEnter={() => setHoveredBucketStart(point.bucketStart)}
                                            >
                                                <div className="relative flex h-48 w-full items-end overflow-hidden rounded-sm border border-border/60 bg-background/65 transition-colors group-hover:border-chart-2/70 group-focus-visible:border-chart-2/70">
                                                    <span
                                                        className="block h-full w-full transition-opacity duration-150"
                                                        style={{
                                                            backgroundColor: isActive
                                                                ? "var(--color-chart-2)"
                                                                : "var(--color-chart-1)",
                                                            height: `${height}%`,
                                                            opacity: isActive ? 1 : 0.58,
                                                        }}
                                                    />
                                                </div>
                                                <span
                                                    className={cn(
                                                        "text-[10px] leading-tight text-muted-foreground",
                                                        !showLabel && "opacity-0",
                                                        isActive && "text-foreground"
                                                    )}
                                                >
                                                    {showLabel ? formatShortDate(point.bucketStart, props.bucketUnit) : "."}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
