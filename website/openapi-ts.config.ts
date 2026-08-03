import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "../master/target/openapi/openapi.json",
  output: "lib/api/generated",
  plugins: [
    {
      name: "@hey-api/client-fetch",
      throwOnError: true,
    },
    "@hey-api/typescript",
    "@hey-api/sdk",
    {
      name: "@tanstack/react-query",
      queryKeys: { tags: true },
      queryOptions: true,
      mutationKeys: true,
      mutationOptions: true,
    },
  ],
});
