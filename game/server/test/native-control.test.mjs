import assert from "node:assert/strict";
import { Duplex } from "node:stream";
import { test } from "node:test";
import { NativeControl, readPlayerConnection } from "../dist/app/native-control.mjs";

function report(ip, info) {
  const payload = Buffer.from(`${ip}\0${info}`, "latin1");
  const frame = Buffer.alloc(4 + payload.length);
  frame.writeUInt32BE(payload.length);
  payload.copy(frame, 4);
  return frame;
}

test("native reports use the transport IP and omit private userinfo", () => {
  const connection = readPlayerConnection(report("::ffff:203.0.113.7",
    "\\name\\^1Ranger\\rate\\25000\\clientip\\198.51.100.99\\ip\\spoofed"
    + "\\password\\secret\\rconPassword\\secret").subarray(4));
  assert.equal(connection.clientIp, "203.0.113.7");
  assert.equal(connection.playerName, "^1Ranger");
  assert.deepEqual({ ...connection.userinfo }, { name: "^1Ranger", rate: "25000" });
  for (const payload of [Buffer.from("no-separator"), Buffer.from("invalid\0\\name\\Player"),
    Buffer.from("203.0.113.7\0\\rate\\25000"), Buffer.from("203.0.113.7\0\\name")]) {
    assert.throws(() => readPlayerConnection(payload));
  }
});

test("control handles split and coalesced reports and sends complete ban snapshots", async () => {
  const output = [];
  const connections = [];
  const errors = [];
  const stream = new Duplex({ read() {}, write(chunk, _encoding, callback) { output.push(chunk); callback(); } });
  const control = new NativeControl(stream, (value) => connections.push(value), (error) => errors.push(error));
  control.setPolicy(false, ["::ffff:203.0.113.7", "2001:db8::1"]);
  const policy = output[0];
  assert.equal(policy.readUInt32BE(), policy.length - 4);
  assert.equal(policy[4], 0);
  assert.equal(policy.subarray(5).toString(), "203.0.113.7\n2001:db8::1\n");
  const frames = Buffer.concat([report("203.0.113.7", "\\name\\One"), report("2001:db8::1", "\\name\\Two")]);
  stream.push(frames.subarray(0, 2));
  stream.push(frames.subarray(2, 9));
  stream.push(frames.subarray(9));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(connections.map((value) => value.playerName), ["One", "Two"]);
  assert.equal(errors.length, 0);
  const invalid = Buffer.alloc(4);
  invalid.writeUInt32BE(2000000);
  stream.push(invalid);
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(errors[0].message, /length/);
  assert.throws(() => control.setPolicy(true, ["invalid\n203.0.113.7"]));
  stream.destroy();
});
