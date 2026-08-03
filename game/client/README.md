# @q3js/client

Framework-independent browser client for Q3JS. It owns the Emscripten runtime,
virtual filesystem, asset loading, persistence, WebSocket configuration, and
mobile input bridge.

Build it from the repository root:

```sh
make client
```

Then consume it from a browser-only module:

```ts
import { createQ3Client } from "@q3js/client";

const client = await createQ3Client({
  canvas,
  server: {
    websocketUrl: "wss://example.test:27960",
    address: "example.test:27960",
  },
  assets: [
    { url: "/baseq3/pak0.pk3", path: "/baseq3/pak0.pk3" },
  ],
});
```
