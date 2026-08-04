import assert from "node:assert/strict";
import { test } from "node:test";
import { HealthServer } from "../dist/app/health-server.mjs";

test("health server reports game readiness and the local WebTransport certificate", async () => {
  let ready = false;
  const server = new HealthServer({
    host: "127.0.0.1",
    port: 0,
    ready: () => ready,
    certificateHash: "a".repeat(64),
  });
  await server.start();
  const endpoint = `http://127.0.0.1:${server.address().port}/healthz`;

  const starting = await fetch(endpoint);
  assert.equal(starting.status, 503);
  assert.equal((await starting.json()).status, "starting");

  ready = true;
  const running = await fetch(endpoint);
  assert.equal(running.status, 200);
  assert.equal((await running.json()).webTransport, "up");

  const transport = await fetch(`http://127.0.0.1:${server.address().port}/webtransport.json`);
  assert.equal(transport.headers.get("access-control-allow-origin"), "*");
  assert.equal((await transport.json()).certificateHash, "a".repeat(64));

  await server.stop();
});
