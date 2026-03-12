import {type ClassValue, clsx} from 'clsx'
import {twMerge} from 'tailwind-merge'
import {ServerResponse} from "@/lib/client";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getPingColor(ping: number | undefined) {
    return !ping ? "text-muted-foreground" : ping < 50 ? "text-primary" : ping < 100 ? "text-accent" : "text-muted-foreground"
}

export function getGameLimits(s: ServerResponse) {
    return s.g_gametype === 4 && (s.capturelimit ?? 0) > 0
        ? `${s.capturelimit} caps`
        : s.fraglimit > 0
            ? `${s.fraglimit} frags`
            : s.timelimit > 0
                ? `${s.timelimit}min`
                : "No limit";
}

export function getPercentage(p: number, m: number) {
    return (p / m) * 100;
}


export function stripQ3Colors(s: string) {
    const Q3_COLOR_CODE_REGEX = /\^\d/g
    return s.replace(Q3_COLOR_CODE_REGEX, "");
}

export function toInt(s?: string, d = 0): number {
    const n = parseInt(s ?? "", 10)
    return Number.isFinite(n) ? n : d
}

export function getWsProtocol() {
    return location.protocol === "https:" ? "wss:" : "ws:";
}

