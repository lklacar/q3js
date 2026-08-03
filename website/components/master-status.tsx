"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { QueryBoundary } from "@/components/query-boundary";
import { masterStatusQueryOptions } from "@/lib/master-server-query";

function StatusBadge({ state }: Readonly<{ state: "checking" | "offline" | "online" }>) {
  return (
    <span
      className="inline-flex items-center gap-2 text-[11px] text-muted-foreground"
      aria-live="polite"
    >
      <span className={`size-1.5 rounded-full ${state === "online" ? "bg-green-500" : "bg-muted-foreground"}`} />
      {state === "checking" ? "Checking master" : `Master ${state}`}
    </span>
  );
}

function MasterStatusQuery() {
  const { isError } = useSuspenseQuery(masterStatusQueryOptions());
  return <StatusBadge state={isError ? "offline" : "online"} />;
}

export function MasterStatus() {
  return (
    <QueryBoundary
      pendingFallback={<StatusBadge state="checking" />}
      errorFallback={() => <StatusBadge state="offline" />}
    >
      <MasterStatusQuery />
    </QueryBoundary>
  );
}
