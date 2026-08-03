import { client } from "@/lib/api/generated/client.gen";

client.setConfig({
  baseUrl: process.env.NEXT_PUBLIC_Q3JS_MASTER_URL?.trim() || "http://localhost:8080",
});

export { client };
