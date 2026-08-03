import assert from "node:assert/strict";
import { createSocket } from "node:dgram";
import { test } from "node:test";
import { WebSocket } from "ws";
import { Gateway } from "../dist/app/gateway.mjs";

function listenUdp(socket) {
  return new Promise((resolve, reject) => {
    socket.once("error", reject);
    socket.bind(0, "127.0.0.1", () => {
      socket.off("error", reject);
      resolve();
    });
  });
}

function within(promise, label) {
  let timeout;
  const result = Promise.race([
    promise,
    new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error(`${label} timed out`)), 2000);
    }),
  ]);
  return result.finally(() => clearTimeout(timeout));
}

test("gateway forwards binary WebSocket messages through UDP", async () => {
  const udp = createSocket("udp4");
  await within(listenUdp(udp), "UDP bind");
  udp.on("message", (message, remote) => udp.send(message, remote.port, remote.address));
  const udpAddress = udp.address();

  const gateway = new Gateway({
    host: "127.0.0.1",
    port: 0,
    targetHost: "127.0.0.1",
    targetPort: udpAddress.port,
    maxConnections: 2,
    maxPacketBytes: 65535,
    idleTimeoutMs: 5000,
    ready: () => true,
  });
  await within(gateway.start(), "gateway start");

  const webSocket = new WebSocket(`ws://127.0.0.1:${gateway.address().port}/ws`);
  await within(new Promise((resolve, reject) => {
    webSocket.once("open", resolve);
    webSocket.once("error", reject);
  }), "WebSocket open");

  const response = new Promise((resolve) => webSocket.once("message", resolve));
  webSocket.send(Buffer.from("q3js"));
  const message = await within(response, "gateway response");
  assert.equal(Buffer.from(message).toString(), "q3js");

  webSocket.close();
  await within(new Promise((resolve) => webSocket.once("close", resolve)), "WebSocket close");
  await within(gateway.stop(), "gateway stop");
  udp.close();
});
