"use client";

import {useEffect, useState} from "react";
import {LOCAL_STORAGE_SYNC_EVENT, PLAYER_NAME_STORAGE_KEY} from "@/lib/jedi-academy";

export function useStoredPlayerName() {
    const [playerName, setPlayerName] = useState("");

    useEffect(() => {
        const readPlayerName = () => {
            try {
                setPlayerName(window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY) ?? "");
            } catch {
                setPlayerName("");
            }
        };

        readPlayerName();

        const readAfterSiblingEffectsTimer = window.setTimeout(readPlayerName, 0);

        window.addEventListener("storage", readPlayerName);
        window.addEventListener(LOCAL_STORAGE_SYNC_EVENT, readPlayerName);

        return () => {
            window.clearTimeout(readAfterSiblingEffectsTimer);
            window.removeEventListener("storage", readPlayerName);
            window.removeEventListener(LOCAL_STORAGE_SYNC_EVENT, readPlayerName);
        };
    }, []);

    return playerName;
}
