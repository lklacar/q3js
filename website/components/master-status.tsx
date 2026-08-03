"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { QueryBoundary } from "@/components/query-boundary";
import { masterStatusQueryOptions } from "@/lib/master-server-query";

function StatusBadge({ state }: Readonly<{ state: "checking" | "offline" | "online" }>) {
  return (
    <span
      className="inline-flex h-7 items-center gap-2 border border-border px-2.5 text-[10px] uppercase text-muted-foreground"
      aria-live="polite"
    >
      <span className={`size-1.5 ${state === "online" ? "bg-green-500" : "bg-muted-foreground"}`} />
      Master {state}
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
