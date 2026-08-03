import { queryOptions } from "@tanstack/react-query";
import { getScoreboardOptions } from "@/lib/api/generated/@tanstack/react-query.gen";
import type { ScoreboardPeriod } from "@/lib/api/generated/types.gen";
import { client } from "@/lib/api/client";

export function scoreboardPreviewQueryOptions(period: ScoreboardPeriod) {
  return queryOptions({
    ...getScoreboardOptions({
      client,
      query: {
        period: period.toLowerCase().replace("_", "-"),
        page: 1,
        pageSize: 5,
        timeZone: "UTC",
      },
    }),
    refetchInterval: 30_000,
  });
}
