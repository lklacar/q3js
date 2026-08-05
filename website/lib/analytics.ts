"use client";

import { sendGAEvent } from "@next/third-parties/google";

const USER_ID_KEY = "q3js-analytics-user-id";
const SESSION_ID_KEY = "q3js-analytics-session-id";
const MAX_STRING_LENGTH = 100;

export type AnalyticsValue = string | number | boolean | undefined;
export type AnalyticsParameters = Readonly<Record<string, AnalyticsValue>>;

let memoryUserId: string | undefined;
let memorySessionId: string | undefined;

function createRandomId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validStoredId(value: string | null): value is string {
  return Boolean(value && /^[a-f0-9-]{16,64}$/i.test(value));
}

function storageId(
  storage: Storage | undefined,
  key: string,
  memoryValue: string | undefined,
  remember: (value: string) => void,
): string {
  if (memoryValue) return memoryValue;

  try {
    const stored = storage?.getItem(key) ?? null;
    if (validStoredId(stored)) {
      remember(stored);
      return stored;
    }
  } catch {
    // Strict privacy modes can deny storage; the in-memory ID remains useful
    // for correlating events during the current page lifecycle.
  }

  const created = createRandomId();
  remember(created);
  try {
    storage?.setItem(key, created);
  } catch {
    // Keep the in-memory identifier when storage is unavailable.
  }
  return created;
}

function browserStorage(kind: "local" | "session"): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return undefined;
  }
}

function anonymousUserId(): string {
  return storageId(
    browserStorage("local"),
    USER_ID_KEY,
    memoryUserId,
    (value) => { memoryUserId = value; },
  );
}

function anonymousSessionId(): string {
  return storageId(
    browserStorage("session"),
    SESSION_ID_KEY,
    memorySessionId,
    (value) => { memorySessionId = value; },
  );
}

function safeString(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, MAX_STRING_LENGTH);
}

function safeParameters(parameters: AnalyticsParameters): Record<string, string | number | boolean> {
  const safe: Record<string, string | number | boolean> = {};
  for (const [name, value] of Object.entries(parameters)) {
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(name) || value === undefined) continue;
    if (typeof value === "number") {
      if (Number.isFinite(value)) safe[name] = value;
    } else if (typeof value === "string") {
      safe[name] = safeString(value);
    } else {
      safe[name] = value;
    }
  }
  return safe;
}

export function createAnalyticsId(): string {
  return createRandomId();
}

export function trackAnalyticsEvent(
  eventName: string,
  parameters: AnalyticsParameters = {},
  options: Readonly<{ beacon?: boolean }> = {},
): void {
  if (typeof window === "undefined" || !/^[a-z][a-z0-9_]{0,39}$/.test(eventName)) return;

  const timestamp = Date.now();
  sendGAEvent("event", eventName, {
    ...safeParameters(parameters),
    anonymous_user_id: anonymousUserId(),
    anonymous_session_id: anonymousSessionId(),
    client_timestamp_ms: timestamp,
    page_path: safeString(window.location.pathname),
    page_visibility: document.visibilityState,
    ...(options.beacon ? { transport_type: "beacon" } : {}),
  });
}

/** Convert arbitrary client errors to a bounded, non-sensitive taxonomy. */
export function classifyPlayError(error: unknown): string {
  const name = error instanceof Error ? error.name.toLowerCase() : "";
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (name === "aborterror" || message.includes("abort")) return "aborted";
  if (message.includes("manifest") && message.includes("invalid")) return "asset_manifest_invalid";
  if (message.includes("manifest")) return "asset_manifest_unavailable";
  if (message.includes("no ") && message.includes("pk3")) return "assets_missing";
  if (message.includes("websocket") || message.includes("socket")) return "websocket_error";
  if (message.includes("fetch") || message.includes("network") || message.includes("http")) return "network_error";
  if (message.includes("webgl") || message.includes("graphics")) return "graphics_error";
  if (message.includes("wasm") || message.includes("webassembly")) return "engine_load_error";
  if (message.includes("memory")) return "memory_error";
  return "unknown_error";
}
