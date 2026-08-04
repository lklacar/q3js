import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

const source = await readFile(
  new URL("../../engine/code/web/webtransport-framing.js", import.meta.url),
  "utf8",
);
vm.runInThisContext(source, { filename: "webtransport-framing.js" });

const framing = globalThis.Q3WebTransportFraming;

test("WebTransport framing reassembles a fragmented packet out of order", () => {
  const packet = Uint8Array.from({ length: 2_500 }, (_, index) => index % 251);
  const frames = framing.framePacket(packet, 42, 1_000);

  assert.equal(frames.length, 3);
  assert.ok(frames.every((frame) => frame.byteLength <= 1_000));

  const reassembler = new framing.Reassembler();
  assert.equal(reassembler.push(frames[2]), null);
  assert.equal(reassembler.push(frames[0]), null);
  assert.deepEqual(reassembler.push(frames[1]), packet);
});

test("WebTransport framing rejects malformed and oversized packets", () => {
  const reassembler = new framing.Reassembler();
  assert.equal(reassembler.push(new Uint8Array([1, 2, 3])), null);
  assert.throws(
    () => framing.framePacket(new Uint8Array(65_536), 1, 1_000),
    /exceeds 65535 bytes/,
  );
});
