"use client";

import {useEffect} from "react";
import {usePathname, useSearchParams} from "next/navigation";
import {env} from "@/env";

const HEARTBEAT_INTERVAL_MS = 5000;

function endpoint() {
    return `${env.NEXT_PUBLIC_MASTER_SERVER_URL.replace(/\/$/, "")}/api/page-visits`;
}

function getPlayerName(urlPlayerName: string | null) {
    if (urlPlayerName?.trim()) {
        return urlPlayerName;
    }

    try {
        return window.localStorage.getItem("name") ?? "";
    } catch {
        return "";
    }
}

function reportVisit(path: string, urlPlayerName: string | null) {
    const payload = JSON.stringify({
        playerName: getPlayerName(urlPlayerName),
        path,
    });

    if (navigator.sendBeacon) {
        const blob = new Blob([payload], {type: "application/json"});
        if (navigator.sendBeacon(endpoint(), blob)) {
            return;
        }
    }

    fetch(endpoint(), {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: payload,
        keepalive: true,
    }).catch(() => undefined);
}

export function PageVisitReporter() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const urlPlayerName = searchParams?.get("name") ?? null;

    useEffect(() => {
        if (!pathname) {
            return;
        }

        reportVisit(pathname, urlPlayerName);
        const interval = window.setInterval(() => reportVisit(pathname, urlPlayerName), HEARTBEAT_INTERVAL_MS);
        return () => window.clearInterval(interval);
    }, [pathname, urlPlayerName]);

    return null;
}
