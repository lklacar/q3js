import assert from "node:assert/strict";
import { test } from "node:test";
import { compressHuffman, decompressHuffman } from "./fixtures/huffman.mjs";

const CONNECT_PAYLOAD = Buffer.from(
  "\"\\name\\Ranger\\rate\\25000\\snaps\\40\\model\\sarge"
  + "\\headmodel\\sarge\\handicap\\100\\color1\\4\\color2\\5"
  + "\\cg_predictItems\\1\\teamoverlay\\1\\cl_anonymous\\0\\sex\\male"
  + "\\protocol\\71\\qport\\12345\\challenge\\67890\"",
  "latin1",
);

// Generated with Huff_Compress from game/engine/code/qcommon/huffman.c.
const REFERENCE_ENCODING = Buffer.from(
  "00bd4474b08b216cc794507ac09cc5097be31216a6833561189dc1f95338e03b2"
  + "c7afdd84f4c06b0b9c5ec7e6221cdef6cee4fa2e17745d8b144180b398451f3f"
  + "9589afc0eddf7aa2ab4df79f7a36f62cfaeed4b2463eaf6f98a9b2cc38d915ec"
  + "47372b3673759753ce6e0da266be8e2b173fd47227db58249b0ebc57114e56941"
  + "18c12c889f72b36c667818b6dd0d1c2538e716",
  "hex",
);

test("Huffman codec is byte-compatible with ioquake3", () => {
  assert.deepEqual(compressHuffman(CONNECT_PAYLOAD), REFERENCE_ENCODING);
  assert.deepEqual(decompressHuffman(REFERENCE_ENCODING), CONNECT_PAYLOAD);
});

test("Huffman decoder rejects truncated input", () => {
  assert.throws(
    () => decompressHuffman(REFERENCE_ENCODING.subarray(0, -10)),
    /Truncated Huffman data/,
  );
});
