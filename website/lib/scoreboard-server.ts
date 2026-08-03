import "server-only";

import { cache } from "react";
import { getScoreboard } from "@/lib/api/generated/sdk.gen";
import type { ScoreboardPageResponse } from "@/lib/api/generated/types.gen";
import { serverApiClient } from "@/lib/api/server-client";

export const fetchScoreboard = cache(async (
  period: string,
  timeZone: string,
  page: number,
  pageSize: number,
  search: string,
): Promise<ScoreboardPageResponse> => {
  const result = await getScoreboard({
    client: serverApiClient,
    query: {
      period,
      timeZone,
      page,
      pageSize,
      search: search || undefined,
    },
    cache: "no-store",
    throwOnError: false,
  });

  if (!result.data) {
    throw new Error(`Unable to load scoreboard (${result.response?.status ?? "network error"}).`);
  }
  return result.data;
});
