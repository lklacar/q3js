import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(
  new URL("../../engine/code/web/client-webtransport-pre.js", import.meta.url),
  "utf8",
);

function engineContext(webtransport) {
  const createPeer = function() {};
  const context = {
    Module: webtransport ? { webtransport } : {},
    SOCKFS: { websocket_sock_ops: { createPeer } },
  };
  vm.runInNewContext(source, context, { filename: "client-webtransport-pre.js" });
  return { context, createPeer };
}

test("keeps the legacy WebSocket backend when no transport is declared", () => {
  const { context, createPeer } = engineContext();

  assert.doesNotThrow(() => context.Module.preRun[0]());
  assert.equal(context.SOCKFS.websocket_sock_ops.createPeer, createPeer);
});

test("installs the WebTransport backend only when explicitly configured", () => {
  const { context, createPeer } = engineContext({ url: "https://game.example/wt" });
  context.WebTransport = function() {};

  context.Module.preRun[0]();

  assert.notEqual(context.SOCKFS.websocket_sock_ops.createPeer, createPeer);
});
