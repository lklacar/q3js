import "server-only";

import { createClient } from "@/lib/api/generated/client";

const baseUrl = process.env.Q3JS_MASTER_URL?.trim()
  || process.env.NEXT_PUBLIC_Q3JS_MASTER_URL?.trim()
  || "http://localhost:8080";

export const serverApiClient = createClient({ baseUrl });
