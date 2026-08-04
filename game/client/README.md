# @q3js/client

Framework-independent browser client for Q3JS. It owns the Emscripten runtime,
virtual filesystem, asset loading, persistence, network transport configuration, and
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
    transport: "webtransport",
    webtransportUrl: "https://example.test:27961/wt",
    address: "example.test:27960",
  },
  player: {
    name: "Ranger",
    countryCode: "RS",
  },
  assets: [
    { url: "/baseq3/pak0.pk3", path: "/baseq3/pak0.pk3" },
  ],
});
```

The endpoint must be HTTPS and support HTTP/3 WebTransport datagrams. For a
short-lived development certificate, pass its SHA-256 DER fingerprint through
`serverCertificateHashes`; production servers should normally use a publicly
trusted TLS certificate.

Legacy WebSocket gateways remain supported. Omit `transport` (or set it to
`"websocket"`) and provide `websocketUrl`; WebSocket is deliberately the
fallback when no transport is declared:

```ts
server: {
  websocketUrl: "wss://community.example/ws",
  address: "community.example:443",
}
```

`player.countryCode` is normalized as a two-letter ISO code and sent through
Quake userinfo as `country`, allowing compatible game VMs to show it on the
in-game scoreboard.
