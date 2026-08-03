import { queryOptions } from "@tanstack/react-query";
import {
  getStatsOptions,
  serversOptions,
  statusOptions,
} from "@/lib/api/generated/@tanstack/react-query.gen";
import { client } from "@/lib/api/client";
import { mapServers } from "@/lib/master-server";

export function masterServerQueryOptions() {
  return queryOptions({
    ...serversOptions({ client }),
    select: mapServers,
    refetchInterval: 5_000,
  });
}

export function masterStatusQueryOptions() {
  return queryOptions({
    ...statusOptions({ client }),
    refetchInterval: 5_000,
  });
}

export function masterStatsQueryOptions() {
  return queryOptions({
    ...getStatsOptions({ client }),
    refetchInterval: 5_000,
  });
}
