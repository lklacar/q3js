"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { PLAYER_NAME_STORAGE_KEY, randomPlayerName } from "@/lib/player-name";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  const syncAcrossTabs = (event: StorageEvent) => {
    if (event.key === PLAYER_NAME_STORAGE_KEY) {
      listener();
    }
  };
  window.addEventListener("storage", syncAcrossTabs);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", syncAcrossTabs);
  };
}

function storedPlayerName(): string | undefined {
  const currentName = window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY);
  if (currentName !== null) {
    return currentName;
  }
  return window.localStorage.getItem("name")?.trim() || undefined;
}

function storePlayerName(value: string) {
  window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, value);
  listeners.forEach((listener) => listener());
}

export function usePlayerName(initialName?: string) {
  const normalizedInitialName = initialName?.trim();
  const fallbackName = normalizedInitialName || "Player";
  const playerName = useSyncExternalStore(
    subscribe,
    () => storedPlayerName() ?? fallbackName,
    () => fallbackName,
  );

  useEffect(() => {
    if (normalizedInitialName) {
      storePlayerName(normalizedInitialName);
    }
  }, [normalizedInitialName]);

  const setPlayerName = useCallback((value: string) => {
    storePlayerName(value);
  }, []);

  const randomizePlayerName = useCallback(() => {
    const value = randomPlayerName();
    setPlayerName(value);
  }, [setPlayerName]);

  return { playerName, randomizePlayerName, setPlayerName };
}
