import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/api/generated/client";
import { getProfile } from "@/lib/api/generated/sdk.gen";
import type { ProfileResponse } from "@/lib/api/generated/types.gen";

const baseUrl = process.env.Q3JS_MASTER_URL?.trim()
  || process.env.NEXT_PUBLIC_Q3JS_MASTER_URL?.trim()
  || "http://localhost:8080";

const serverClient = createClient({ baseUrl });

export const fetchProfile = cache(async (
  playerName: string,
  period: string,
  timeZone: string,
): Promise<ProfileResponse | undefined> => {
  const result = await getProfile({
    client: serverClient,
    path: { playerName },
    query: { period, timeZone },
    cache: "no-store",
    throwOnError: false,
  });

  if (result.response?.status === 404) {
    return undefined;
  }
  if (!result.data) {
    throw new Error(`Unable to load player profile (${result.response?.status ?? "network error"}).`);
  }
  return result.data;
});
