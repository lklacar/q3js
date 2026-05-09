"use client";

import {type RefObject, useEffect, useRef, useState} from "react";
import {Card} from "@/components/ui/card";
import {Progress} from "@/components/ui/progress";
import {makeRafUpdater, type Prog} from "@/lib/fs.ts";
import {useFullscreenOnF11} from "@/hooks/use-fullscreen.ts";
import startGame from "@/game";
import {useSearchParams} from "next/navigation";
import {toInt} from "@/lib/utils.ts";
import {MobileControls} from "@/components/mobile-controls";
import {
    clearIOQ3Runtime,
    hasIOQ3MobileBridge,
    initIOQ3MobileBindings,
    resizeIOQ3Canvas
} from "@/lib/ioquake3-runtime";

const STAGE_LABELS: Record<Prog["stage"], string> = {
    initializing: "Initializing",
    downloading: "Downloading assets",
    launching: "Launching",
    ready: "Ready",
};

const STAGE_TIPS: Record<Prog["stage"], string> = {
    initializing: "Tip: Press F11 to toggle fullscreen.",
    downloading: "Tip: Assets are cached after first load.",
    launching: "Tip: If sound is muted, click the page once.",
    ready: "Tip: If sound is muted, click the page once.",
};

const MOBILE_RESIZE_DEBOUNCE_MS = 250;
const MOBILE_RENDER_SCALE = 2;
const MOBILE_SIZE_MONITOR_MS = 150;
const MOBILE_SIZE_STABLE_TICKS = 2;

type FullscreenCapableElement = HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
};

type ScreenOrientationLockMode = "any" | "natural" | "landscape" | "portrait" | "portrait-primary" | "portrait-secondary" | "landscape-primary" | "landscape-secondary";

type ScreenOrientationWithLock = ScreenOrientation & {
    lock?: (orientation: ScreenOrientationLockMode) => Promise<void>;
};

function isIPhoneUserAgent() {
    if (typeof navigator === "undefined") {
        return false;
    }

    return /iPhone/i.test(navigator.userAgent);
}

function getCanvasDisplaySize(target: HTMLElement) {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement | null;
    const element = canvas ?? target;
    const rect = element.getBoundingClientRect();

    return {
        width: Math.max(1, Math.round(rect.width || element.clientWidth || target.clientWidth || window.innerWidth)),
        height: Math.max(1, Math.round(rect.height || element.clientHeight || target.clientHeight || window.innerHeight)),
    };
}

function useLandscapeFullscreen(targetRef: RefObject<HTMLElement | null>) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLandscape, setIsLandscape] = useState(true);
    const [hasSeenLandscape, setHasSeenLandscape] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [canRequestFullscreen, setCanRequestFullscreen] = useState(true);
    const [isViewportReady, setIsViewportReady] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const mediaQuery = window.matchMedia("(pointer: coarse)");
        const screenOrientation = typeof screen !== "undefined" ? screen.orientation : null;
        const updateTouchMode = () => setIsTouchDevice(mediaQuery.matches || navigator.maxTouchPoints > 0);
        const updateOrientation = () => {
            let nextIsLandscape = window.innerWidth >= window.innerHeight;
            const target = targetRef.current;
            if (target) {
                const {width, height} = getCanvasDisplaySize(target);
                nextIsLandscape = width >= height;
            }
            setIsLandscape(nextIsLandscape);
            if (nextIsLandscape) {
                setHasSeenLandscape(true);
            }
            setIsViewportReady(true);
        };
        const updateFullscreen = () => {
            const fullscreenElement = document.fullscreenElement;
            if (!fullscreenElement) {
                setIsFullscreen(false);
                return;
            }

            if (targetRef.current) {
                setIsFullscreen(fullscreenElement === targetRef.current || targetRef.current.contains(fullscreenElement));
                return;
            }

            setIsFullscreen(true);
        };
        const updateFullscreenSupport = () => {
            setCanRequestFullscreen(
                !isIPhoneUserAgent() && Boolean(
                    document.fullscreenEnabled
                    || (targetRef.current as FullscreenCapableElement | null)?.webkitRequestFullscreen
                )
            );
        };

        updateTouchMode();
        updateOrientation();
        updateFullscreen();
        updateFullscreenSupport();

        mediaQuery.addEventListener("change", updateTouchMode);
        window.addEventListener("resize", updateOrientation);
        window.addEventListener("orientationchange", updateOrientation);
        document.addEventListener("fullscreenchange", updateFullscreen);
        screenOrientation?.addEventListener("change", updateOrientation);

        return () => {
            mediaQuery.removeEventListener("change", updateTouchMode);
            window.removeEventListener("resize", updateOrientation);
            window.removeEventListener("orientationchange", updateOrientation);
            document.removeEventListener("fullscreenchange", updateFullscreen);
            screenOrientation?.removeEventListener("change", updateOrientation);
        };
    }, [targetRef]);

    const requestFullscreenLandscape = async () => {
        if (!canRequestFullscreen) {
            return;
        }

        const target = targetRef.current ?? document.documentElement;
        const fullscreenTarget = target as FullscreenCapableElement;
        if (!document.fullscreenElement) {
            const requestFullscreen = fullscreenTarget.requestFullscreen?.bind(fullscreenTarget)
                ?? fullscreenTarget.webkitRequestFullscreen?.bind(fullscreenTarget);

            if (requestFullscreen) {
                await Promise.resolve(requestFullscreen()).catch(() => {
                });
            }
        }

        const screenOrientation = (screen.orientation ?? null) as ScreenOrientationWithLock | null;
        if (screenOrientation?.lock) {
            await screenOrientation.lock("landscape").catch(() => {
            });
        }
    };

    return {
        isFullscreen,
        isLandscape,
        hasSeenLandscape,
        isTouchDevice,
        canRequestFullscreen,
        isViewportReady,
        requestFullscreenLandscape,
    };
}

export default function GamePage() {
    useFullscreenOnF11();
    const gameShellRef = useRef<HTMLElement | null>(null);
    const startedGameKeyRef = useRef<string | null>(null);

    const [prog, setProg] = useState<Prog>({
        received: 0,
        total: 0,
        pct: 0,
        current: "",
        stage: "initializing"
    });
    const [rafUpdate] = useState(() => makeRafUpdater(setProg));

    const searchParams = useSearchParams();
    const host = searchParams?.get("host") ?? "";
    const proxyPort = toInt(searchParams?.get("proxyPort") ?? undefined, 0);
    const name = searchParams?.get("name") ?? "Player";
    const rconPassword = searchParams?.get("rconPassword") ?? "";
    const fsGame = searchParams?.get("fs_game") ?? "baseq3";
    const forceMobileControls = searchParams?.get("mobileControls") === "1";
    const {
        isFullscreen,
        isLandscape,
        hasSeenLandscape,
        isTouchDevice,
        canRequestFullscreen,
        isViewportReady,
        requestFullscreenLandscape
    } = useLandscapeFullscreen(gameShellRef);
    const [mobileBridgeReady, setMobileBridgeReady] = useState(false);
    const showTouchUi = isTouchDevice || forceMobileControls;
    const portraitGate = showTouchUi && (!isViewportReady || !hasSeenLandscape);
    const showRotateOverlay = showTouchUi && hasSeenLandscape && !isLandscape;
    const canStartGame = Boolean(host && proxyPort && isViewportReady && (!showTouchUi || hasSeenLandscape));
    const gameStartKey = `${host}|${proxyPort}|${name}|${rconPassword}|${fsGame}|${showTouchUi ? "mobile" : "desktop"}`;

    useEffect(() => {
        if (!canStartGame) {
            return;
        }

        if (startedGameKeyRef.current === gameStartKey) {
            return;
        }

        startedGameKeyRef.current = gameStartKey;
        startGame({
            name,
            rconPassword,
            host,
            proxyPort,
            rafUpdate,
            fsGame,
            mobileMode: showTouchUi,
        });
    }, [canStartGame, fsGame, gameStartKey, host, name, proxyPort, rafUpdate, rconPassword, showTouchUi]);

    useEffect(() => {
        return () => {
            clearIOQ3Runtime();
        };
    }, []);

    useEffect(() => {
        document.body.classList.add("game-page-active");
        document.documentElement.classList.add("game-page-active");

        return () => {
            document.body.classList.remove("game-page-active");
            document.documentElement.classList.remove("game-page-active");
        };
    }, []);

    useEffect(() => {
        if (prog.stage !== "ready") {
            return;
        }

        const syncBridge = () => {
            initIOQ3MobileBindings();
            const ready = hasIOQ3MobileBridge();
            setMobileBridgeReady(ready);
            return ready;
        };

        if (syncBridge()) {
            return;
        }

        const intervalId = window.setInterval(() => {
            if (syncBridge()) {
                window.clearInterval(intervalId);
            }
        }, 100);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [prog.stage]);

    useEffect(() => {
        if (!showTouchUi || prog.stage !== "ready" || !mobileBridgeReady) {
            return;
        }

        const target = gameShellRef.current;
        if (!target) {
            return;
        }

        let timeoutId: number | null = null;
        let monitorIntervalId: number | null = null;
        let lastAppliedWidth = 0;
        let lastAppliedHeight = 0;
        let observedWidth = 0;
        let observedHeight = 0;
        let stableTicks = 0;

        const syncResolution = () => {
            const {width, height} = getCanvasDisplaySize(target);
            const renderWidth = width * MOBILE_RENDER_SCALE;
            const renderHeight = height * MOBILE_RENDER_SCALE;

            if (renderWidth === lastAppliedWidth && renderHeight === lastAppliedHeight) {
                return;
            }

            lastAppliedWidth = renderWidth;
            lastAppliedHeight = renderHeight;
            resizeIOQ3Canvas(renderWidth, renderHeight);
        };

        const updateObservedSize = () => {
            const {width, height} = getCanvasDisplaySize(target);

            if (width === observedWidth && height === observedHeight) {
                stableTicks += 1;
            } else {
                observedWidth = width;
                observedHeight = height;
                stableTicks = 0;
            }

            if (stableTicks >= MOBILE_SIZE_STABLE_TICKS) {
                syncResolution();
            }
        };

        const scheduleSync = () => {
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }

            timeoutId = window.setTimeout(() => {
                timeoutId = null;
                updateObservedSize();
            }, MOBILE_RESIZE_DEBOUNCE_MS);
        };

        const scheduleOrientationSync = () => {
            stableTicks = 0;
            observedWidth = 0;
            observedHeight = 0;
            scheduleSync();
        };

        updateObservedSize();
        monitorIntervalId = window.setInterval(updateObservedSize, MOBILE_SIZE_MONITOR_MS);

        const resizeObserver = new ResizeObserver(scheduleSync);
        resizeObserver.observe(target);

        const visualViewport = window.visualViewport;
        const screenOrientation = typeof screen !== "undefined" ? screen.orientation : null;

        window.addEventListener("resize", scheduleSync);
        window.addEventListener("orientationchange", scheduleOrientationSync);
        document.addEventListener("fullscreenchange", scheduleSync);
        visualViewport?.addEventListener("resize", scheduleSync);
        screenOrientation?.addEventListener("change", scheduleOrientationSync);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", scheduleSync);
            window.removeEventListener("orientationchange", scheduleOrientationSync);
            document.removeEventListener("fullscreenchange", scheduleSync);
            visualViewport?.removeEventListener("resize", scheduleSync);
            screenOrientation?.removeEventListener("change", scheduleOrientationSync);

            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }

            if (monitorIntervalId !== null) {
                window.clearInterval(monitorIntervalId);
            }
        };
    }, [mobileBridgeReady, prog.stage, showTouchUi]);

    const stageLabel = STAGE_LABELS[prog.stage];
    const tip = showTouchUi
        ? {
            initializing: "Tip: Mobile controls appear after the engine starts.",
            downloading: "Tip: Assets are cached after first load.",
            launching: canRequestFullscreen
                ? "Tip: Tap Fullscreen to lock into landscape mode."
                : "Tip: Rotate the phone to landscape. iPhone browsers may not allow page fullscreen.",
            ready: isFullscreen
                ? "Tip: Use the left stick to move and drag the right pad to aim."
                : canRequestFullscreen
                    ? "Tip: Tap Fullscreen to lock into landscape mode."
                    : "Tip: Rotate the phone to landscape. iPhone browsers may not allow page fullscreen.",
        }[prog.stage]
        : STAGE_TIPS[prog.stage];
    const currentLabel = prog.current
        ? {
            downloading: `Downloading: ${prog.current}`,
            initializing: prog.current,
            launching: prog.current,
            ready: prog.current,
        }[prog.stage]
        : "Preparing downloads";
    const showMobileControls = showTouchUi && prog.stage === "ready" && mobileBridgeReady && !showRotateOverlay;

    // fix an issue with mouse pointer not getting captured back by ioquake3 after Alt+Tab or Escape
    useEffect(() => {
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        if (!canvas) return;

        // suppress ioquake3 from releasing pointer lock
        const originalExit = document.exitPointerLock.bind(document);
        document.exitPointerLock = () => {
            console.warn('exitPointerLock suppressed');
        };

        // since ioquake3 won't re-request it either, we do it ourselves
        const handleClick = () => {
            if (document.pointerLockElement !== canvas) {
            canvas.requestPointerLock();
            }
        };

        canvas.addEventListener('click', handleClick);

        return () => {
            document.exitPointerLock = originalExit;
            canvas.removeEventListener('click', handleClick);
        };
    }, []);

    if (portraitGate) {
        return (
            <main className="fixed inset-0 flex min-h-dvh w-screen items-center justify-center overflow-hidden bg-black px-6 text-white">
                <div className="max-w-sm text-center">
                    <div className="text-[12px] font-black uppercase tracking-[0.38em] text-white/55">
                        Landscape Required
                    </div>
                    <h1 className="mt-4 text-3xl font-black uppercase tracking-[0.12em]">
                        Rotate Your Phone
                    </h1>
                    <p className="mt-4 text-sm leading-6 text-white/72">
                        {isViewportReady
                            ? "Mobile play is only available in landscape. Rotate the device, then the game will load."
                            : "Checking device orientation before starting the game."}
                    </p>
                    {canRequestFullscreen && (
                        <button
                            type="button"
                            className="mt-6 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.24em]"
                            onClick={() => {
                                void requestFullscreenLandscape();
                            }}
                        >
                            Enter Fullscreen
                        </button>
                    )}
                </div>
            </main>
        );
    }

    return (
        <main ref={gameShellRef} className="relative isolate h-dvh min-h-dvh w-screen overflow-hidden bg-black">
            <h1 className="sr-only">Play Quake III Arena in your browser</h1>
            <canvas id="canvas" className="absolute inset-0 z-0 h-full w-full"/>
            {showMobileControls && (
                <MobileControls
                    canRequestFullscreen={canRequestFullscreen}
                    onRequestFullscreen={requestFullscreenLandscape}
                    portraitBlocked={false}
                />
            )}
            {showRotateOverlay && (
                <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black px-6 text-white">
                    <div className="max-w-sm text-center">
                        <div className="text-[12px] font-black uppercase tracking-[0.38em] text-white/55">
                            Landscape Required
                        </div>
                        <h2 className="mt-4 text-3xl font-black uppercase tracking-[0.12em]">
                            Rotate Your Phone
                        </h2>
                        <p className="mt-4 text-sm leading-6 text-white/72">
                            Rotate back to landscape to continue playing.
                        </p>
                    </div>
                </div>
            )}
            {prog.stage !== "ready" && (
                <Card
                    className="absolute bottom-4 left-4 right-4 z-10 border border-border bg-background/80 p-4 backdrop-blur">
                    <div className="text-sm font-semibold mb-1">
                        {stageLabel}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2 font-mono">
                        {currentLabel}
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
