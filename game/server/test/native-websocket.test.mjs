import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createSocket } from "node:dgram";
import { once } from "node:events";
import { access, cp, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { WebSocket } from "ws";
import { NativeControl } from "../dist/app/native-control.mjs";
import { compressHuffman } from "./fixtures/huffman.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const binary = process.env.Q3JS_TEST_SERVER_BINARY ?? path.join(root, "game/build/server/Release/ioq3ded");
const basePath = process.env.Q3JS_TEST_BASEPATH ?? path.join(root, "game/server/data");
const packagePath = path.join(root, "game/server/dist/game/q3js");
const oob = (text) => Buffer.from(`\xff\xff\xff\xff${text}\n`, "latin1");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function within(promise, label, ms = 4000) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    })]);
  } finally { clearTimeout(timer); }
}

async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function open(port, options = {}, protocol) {
  const socket = protocol ? new WebSocket(`ws://127.0.0.1:${port}/ws`, protocol, options)
    : new WebSocket(`ws://127.0.0.1:${port}/ws`, options);
  await within(once(socket, "open"), "WebSocket open");
  return socket;
}

async function exchange(socket, packet, prefix) {
  const reply = new Promise((resolve, reject) => {
    const message = (data) => {
      if (!Buffer.from(data).subarray(4).toString("latin1").startsWith(prefix)) return;
      socket.off("message", message);
      socket.off("error", reject);
      resolve(Buffer.from(data));
    };
    socket.on("message", message);
    socket.once("error", reject);
  });
  socket.send(packet);
  return within(reply, prefix);
}

async function join(socket, name, qport = 1234) {
  const reply = await exchange(socket, oob("getchallenge 123 Quake3Arena"), "challengeResponse");
  const challenge = reply.subarray(4).toString().split(" ")[1];
  const info = `\\name\\${name}\\protocol\\71\\qport\\${qport}\\challenge\\${challenge}\\rate\\25000`
    + "\\password\\private\\clientip\\198.51.100.99";
  return exchange(socket, Buffer.concat([Buffer.from("\xff\xff\xff\xffconnect ", "latin1"),
    compressHuffman(Buffer.from(`\"${info}\"`, "latin1"))]), "connectResponse");
}

async function rejection(port, options = {}, url = "/ws") {
  const socket = new WebSocket(`ws://127.0.0.1:${port}${url}`, options);
  socket.on("error", () => {});
  return within(new Promise((resolve, reject) => {
    socket.once("unexpected-response", (_request, response) => {
      response.resume();
      socket.terminate();
      resolve(response.statusCode);
    });
    socket.once("open", () => { socket.terminate(); reject(new Error("Unexpected WebSocket admission")); });
  }), "WebSocket rejection");
}

async function start(t, overrides = []) {
  try {
    await access(binary);
    await access(path.join(basePath, "baseq3/pak0.pk3"));
    await access(packagePath);
  } catch { t.skip("Build the native server and provide baseq3 assets to run integration tests"); return; }
  const home = await mkdtemp(path.join(os.tmpdir(), "q3js-native-test-"));
  await cp(packagePath, path.join(home, "q3js"), { recursive: true });
  const port = await freePort();
  const udpPort = await freePort();
  const args = ["+set", "dedicated", "2", "+set", "fs_basepath", basePath,
    "+set", "fs_homepath", home, "+set", "fs_game", "q3js", "+set", "net_ip", "127.0.0.1",
    "+set", "net_port", String(udpPort), "+set", "net_wsHost", "127.0.0.1",
    "+set", "net_wsPort", String(port), "+set", "net_wsTrustedProxyHops", "1",
    "+set", "sv_killpost_url", "", "+set", "sv_killpost_client_secret", "",
    "+set", "sv_allowDownload", "1", "+set", "sv_pure", "1", ...overrides, "+map", "q3dm17"];
  const child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe", "pipe"],
    env: { ...process.env, Q3JS_NATIVE_CONTROL_FD: "3" } });
  let logs = "";
  child.stdout.on("data", (chunk) => { logs = (logs + chunk).slice(-30000); });
  child.stderr.on("data", (chunk) => { logs = (logs + chunk).slice(-30000); });
  const reports = [];
  const control = new NativeControl(child.stdio[3], (value) => reports.push(value), (error) => { logs += error; });
  const sockets = [];
  t.after(async () => {
    for (const socket of sockets) socket.terminate();
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await within(exited, "server shutdown");
    }
    await rm(home, { recursive: true, force: true });
  });
  control.setPolicy(false, []);
  let listening = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(logs);
    try { const result = await fetch(`http://127.0.0.1:${port}/healthz`); listening = result.status === 503; }
    catch {}
    if (listening) break;
    await pause(50);
  }
  assert.equal(listening, true, logs);
  return { child, port, udpPort, control, reports, sockets, home, logs: () => logs };
}

async function ready(server, bans = []) {
  server.control.setPolicy(true, bans);
  for (let attempt = 0; attempt < 100; attempt++) {
    const response = await fetch(`http://127.0.0.1:${server.port}/healthz`);
    if (response.ok) {
      assert.deepEqual(await response.json(), { status: "ready", gateway: "up", gameServer: "up" });
      return;
    }
    await pause(50);
  }
  throw new Error(server.logs());
}

const forwarded = (ip) => ({ headers: { "x-forwarded-for": ip } });

test("native listener preserves readiness, WebSocket/UDP queries, same-IP joins and reporting", { timeout: 20000 }, async (t) => {
  const server = await start(t);
  if (!server) return;
  assert.equal(await rejection(server.port, forwarded("203.0.113.7")), 503);
  await ready(server);
  assert.equal(await rejection(server.port, {}, "/wrong"), 404);
  assert.equal(await rejection(server.port), 400);
  const one = await open(server.port, forwarded("203.0.113.7"), "binary");
  const two = await open(server.port, forwarded("203.0.113.7"));
  server.sockets.push(one, two);
  assert.equal(one.protocol, "binary");
  const status = await exchange(one, oob("getstatus native"), "statusResponse");
  assert.match(status.toString("latin1"), /q3dm17/);
  const udp = createSocket("udp4");
  t.after(() => udp.close());
  const udpReply = once(udp, "message");
  udp.send(oob("getstatus udp"), server.udpPort, "127.0.0.1");
  assert.match((await within(udpReply, "UDP status"))[0].toString("latin1"), /q3dm17/);
  udp.connect(server.udpPort, "127.0.0.1");
  await once(udp, "connect");
  await join(udp, "Native");
  await join(one, "One");
  await join(two, "Two");
  for (let attempt = 0; server.reports.length < 2 && attempt < 100; attempt++) await pause(10);
  assert.deepEqual(server.reports.map((value) => value.playerName), ["One", "Two"]);
  assert.deepEqual(server.reports.map((value) => value.clientIp), ["203.0.113.7", "203.0.113.7"]);
  assert.ok(server.reports.every((value) => !("password" in value.userinfo) && !("ip" in value.userinfo) && !("clientip" in value.userinfo)));
  const populated = await exchange(two, oob("getstatus players"), "statusResponse");
  assert.match(populated.toString("latin1"), /"Native"/);
  assert.match(populated.toString("latin1"), /"One"/);
  assert.match(populated.toString("latin1"), /"Two"/);
  const closed = once(one, "close");
  one.close();
  await within(closed, "client disconnect");
  const remaining = await exchange(two, oob("getstatus remaining"), "statusResponse");
  assert.doesNotMatch(remaining.toString("latin1"), /"One"/);
  assert.match(remaining.toString("latin1"), /"Two"/);
  const reconnected = await open(server.port, forwarded("203.0.113.7"), "binary");
  server.sockets.push(reconnected);
  await join(reconnected, "Reconnected");
});

test("native listener rejects existing bans and closes newly banned connections", { timeout: 15000 }, async (t) => {
  const server = await start(t);
  if (!server) return;
  await ready(server, ["203.0.113.7", "2001:db8::1"]);
  assert.equal(await rejection(server.port, forwarded("203.0.113.7")), 403);
  assert.equal(await rejection(server.port, forwarded("2001:0db8:0:0:0:0:0:1")), 403);
  const socket = await open(server.port, forwarded("203.0.113.8"));
  server.sockets.push(socket);
  const closed = once(socket, "close");
  server.control.setPolicy(true, ["203.0.113.7", "203.0.113.8"]);
  const [code, reason] = await within(closed, "ban disconnect");
  assert.equal(code, 1008);
  assert.equal(reason.toString(), "IP address banned");
});

test("native listener bounds fragmented packets, connections and idle time", { timeout: 15000 }, async (t) => {
  const server = await start(t, ["+set", "net_wsMaxConnections", "1", "+set", "net_wsMaxPacketBytes", "1024",
    "+set", "net_wsIdleTimeoutMs", "1000"]);
  if (!server) return;
  await ready(server);
  const socket = await open(server.port, forwarded("203.0.113.7"));
  server.sockets.push(socket);
  assert.equal(await rejection(server.port, forwarded("203.0.113.8")), 503);
  socket.send("ignored text");
  const response = once(socket, "message");
  socket.send(oob("getstatus fragmented").subarray(0, 8), { fin: false });
  socket.send(oob("getstatus fragmented").subarray(8), { fin: true });
  assert.match((await within(response, "fragmented status"))[0].toString("latin1"), /statusResponse/);
  const closed = once(socket, "close");
  socket.send(Buffer.alloc(600), { fin: false });
  socket.send(Buffer.alloc(600), { fin: true });
  assert.equal((await within(closed, "oversized packet"))[0], 1009);
  const idle = await open(server.port, forwarded("203.0.113.7"));
  server.sockets.push(idle);
  const [code, reason] = await within(once(idle, "close"), "idle close");
  assert.equal(code, 1000);
  assert.equal(reason.toString(), "Idle timeout");
});
