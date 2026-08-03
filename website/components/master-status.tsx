"use client";

import { useEffect, useState } from "react";
import { fetchServers } from "@/lib/master-server";

type MasterState = "checking" | "online" | "offline";

export function MasterStatus() {
  const [state, setState] = useState<MasterState>("checking");

  useEffect(() => {
    const request = new AbortController();
    fetchServers(request.signal)
      .then(() => setState("online"))
      .catch(() => {
        if (!request.signal.aborted) {
          setState("offline");
        }
      });
    return () => request.abort();
  }, []);

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
