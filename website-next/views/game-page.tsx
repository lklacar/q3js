"use client";

import {useEffect, useRef, useState} from "react";
import {Card} from "@/components/ui/card";
import {Progress} from "@/components/ui/progress";
import {makeRafUpdater, type Prog} from "@/lib/fs.ts";
import {useFullscreenOnF11} from "@/hooks/use-fullscreen.ts";
import startGame from "@/game";
import {trackEvent} from "@/lib/analytics.ts";
import {useSearchParams} from "next/navigation";
import {toInt} from "@/lib/utils.ts";

export default function GamePage() {
    useFullscreenOnF11();

    const [prog, setProg] = useState<Prog>({
        received: 0,
        total: 0,
        pct: 0,
        current: "",
        stage: "initializing"
    });
    const rafUpdate = useRef(makeRafUpdater(setProg)).current;
    const launchStartedAtRef = useRef(performance.now());
    const readyTrackedRef = useRef(false);

    const searchParams = useSearchParams();
    const host = searchParams?.get("host") ?? "";
    const proxyPort = toInt(searchParams?.get("proxyPort") ?? undefined, 0);
    const name = searchParams?.get("name") ?? "Player";

    useEffect(() => {
        trackEvent("game_launch_started");
        if (!host || !proxyPort) {
            return;
        }
        startGame({
            name,
            host,
            proxyPort,
            rafUpdate
        })
    }, [host, name, proxyPort]);

    useEffect(() => {
        if (prog.stage !== "ready" || readyTrackedRef.current) return;

        readyTrackedRef.current = true;
        trackEvent("game_launch_ready", {
            load_time_seconds: Number(((performance.now() - launchStartedAtRef.current) / 1000).toFixed(1)),
        });
    }, [prog.stage]);

    useEffect(() => {
        return () => {
            trackEvent("game_page_exit", {
                duration_seconds: Math.round((performance.now() - launchStartedAtRef.current) / 1000),
                reached_ready: readyTrackedRef.current,
            });
        };
    }, []);

    const stageLabel = prog.stage === "initializing"
        ? "Initializing"
        : prog.stage === "downloading"
            ? "Downloading assets"
            : prog.stage === "launching"
                ? "Launching"
                : "Ready";

    const tip = prog.stage === "initializing"
        ? "Tip: Press F11 to toggle fullscreen."
        : prog.stage === "downloading"
            ? "Tip: Assets are cached after first load."
            : "Tip: If sound is muted, click the page once.";

    return (
        <main className="relative w-full h-full min-h-screen">
            <h1 className="sr-only">Play Quake III Arena in your browser</h1>
            <canvas id="canvas" className="w-full h-full"/>
            {prog.stage !== "ready" && (
                <Card
                    className="absolute bottom-4 left-4 right-4 p-4 bg-background/80 backdrop-blur border border-border">
                    <div className="text-sm font-semibold mb-1">
                        {stageLabel}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2 font-mono">
                        {prog.current
                            ? prog.stage === "downloading"
                                ? `Downloading: ${prog.current}`
                                : prog.current
                            : "Preparing downloads"}
                    </div>
                    <Progress value={prog.pct} className="h-2 bg-secondary"/>
                    <div className="text-xs text-muted-foreground mt-2 font-mono">
                        {prog.total
                            ? `${(prog.received / (1024 * 1024)).toFixed(1)} MB / ${(prog.total / (1024 * 1024)).toFixed(1)} MB`
                            : `${prog.pct}%`}
                    </div>
                    {prog.etaSeconds !== undefined && prog.stage === "downloading" && (
                        <div className="text-xs text-muted-foreground mt-1 font-mono">
                            ETA: {prog.etaSeconds}s
                        </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                        {tip}
                    </div>
                </Card>
            )}
        </main>
    );
}
