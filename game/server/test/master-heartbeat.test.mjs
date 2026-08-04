import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { MasterHeartbeat } from "../dist/app/master-heartbeat.mjs";

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

test("registers the packaged server with the master", async () => {
  let received;
  const server = createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      received = {
        method: request.method,
        path: request.url,
        clientSecret: request.headers["x-q3js-client-secret"],
        body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
      };
      response.writeHead(204);
      response.end();
    });
  });
  await listen(server);
  const address = server.address();

  const heartbeat = new MasterHeartbeat({
    masterBaseUrl: `http://127.0.0.1:${address.port}`,
    eventClientSecret: "0123456789abcdef0123456789abcdef",
    intervalMs: 60_000,
    timeoutMs: 2_000,
    targetHost: "game.example.com",
    proxyPort: 27961,
    targetPort: 27960,
    secure: true,
    transport: "webtransport",
  });

  await heartbeat.start();
  heartbeat.stop();
  await close(server);

  assert.deepEqual(received, {
    method: "PUT",
    path: "/api/servers/heartbeat",
    clientSecret: "0123456789abcdef0123456789abcdef",
    body: {
      targetHost: "game.example.com",
      proxyPort: 27961,
      targetPort: 27960,
      secure: true,
      transport: "webtransport",
    },
  });
});
