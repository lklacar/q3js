import "server-only";

import { cache } from "react";
import { getProfile } from "@/lib/api/generated/sdk.gen";
import type { ProfileResponse } from "@/lib/api/generated/types.gen";
import { serverApiClient } from "@/lib/api/server-client";

export const fetchProfile = cache(async (
  playerName: string,
): Promise<ProfileResponse | undefined> => {
  const result = await getProfile({
    client: serverApiClient,
    path: { playerName },
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
