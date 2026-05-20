"use client";

import {useEffect} from "react";
import {usePathname} from "next/navigation";
import {env} from "@/env";

const HEARTBEAT_INTERVAL_MS = 5000;

function endpoint() {
    return `${env.NEXT_PUBLIC_MASTER_SERVER_URL.replace(/\/$/, "")}/api/page-visits`;
}

function getPlayerName() {
    try {
        return window.localStorage.getItem("name") ?? "";
    } catch {
        return "";
    }
}

function reportVisit(path: string) {
    const payload = JSON.stringify({
        playerName: getPlayerName(),
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

    useEffect(() => {
        if (!pathname) {
            return;
        }

        reportVisit(pathname);
        const interval = window.setInterval(() => reportVisit(pathname), HEARTBEAT_INTERVAL_MS);
        return () => window.clearInterval(interval);
    }, [pathname]);

    return null;
}
