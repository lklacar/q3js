(function() {
  "use strict";

  function patchNodeRawFsCompatibility() {
    if (typeof FS === "undefined" || FS.__ioq3NodeRawFsPatchApplied) {
      return;
    }
    FS.__ioq3NodeRawFsPatchApplied = true;
    const originalIoctl = FS.ioctl;
    FS.ioctl = function(stream, cmd, arg) {
      if (stream && stream.stream_ops && typeof stream.stream_ops.ioctl === "function") {
        return stream.stream_ops.ioctl(stream, cmd, arg);
      }
      return originalIoctl.call(this, stream, cmd, arg);
    };

    const originalInit = FS.init;
    FS.init = function() {
      const result = originalInit.apply(this, arguments);
      const stdin = FS.getStream(0);
      if (stdin && !stdin.stream_ops) {
        stdin.stream_ops = {
          close: function() {},
          fsync: function() {},
          ioctl: function() { throw new FS.ErrnoError(59); },
          poll: function() { return 0; },
          read: function() { return 0; },
        };
      }
      return result;
    };
  }

  class ServerWebTransportSocket {
    constructor(session, remoteAddress, remotePort, configuredDatagramBytes) {
      this.session = session;
      this._socket = { remoteAddress, remotePort };
      this.url = "https://" + remoteAddress + ":" + remotePort + "/wt";
      this.readyState = ServerWebTransportSocket.CONNECTING;
      this.CONNECTING = ServerWebTransportSocket.CONNECTING;
      this.OPEN = ServerWebTransportSocket.OPEN;
      this.CLOSING = ServerWebTransportSocket.CLOSING;
      this.CLOSED = ServerWebTransportSocket.CLOSED;
      this.bufferedAmount = 0;
      this.handlers = new Map();
      this.packetId = 0;
      this.reassembler = new Q3WebTransportFraming.Reassembler();
      this.sendChain = Promise.resolve();
      this.configuredDatagramBytes = configuredDatagramBytes;
      session.ready.then(() => this.handleReady()).catch((error) => this.fail(error));
      session.closed.then(
        () => this.finishClose(),
        (error) => this.fail(error),
      );
    }

    on(event, handler) {
      const handlers = this.handlers.get(event) || [];
      handlers.push(handler);
      this.handlers.set(event, handlers);
      return this;
    }

    emit(event) {
      const args = Array.prototype.slice.call(arguments, 1);
      for (const handler of this.handlers.get(event) || []) {
        handler.apply(undefined, args);
      }
    }

    async handleReady() {
      if (this.readyState !== ServerWebTransportSocket.CONNECTING) {
        return;
      }
      this.datagramBytes = Q3WebTransportFraming.datagramLimit(
        this.session.datagrams,
        this.configuredDatagramBytes,
      );
      this.writer = Q3WebTransportFraming.writableFor(this.session.datagrams).getWriter();
      this.readyState = ServerWebTransportSocket.OPEN;
      this.emit("open");
      void this.readLoop();
    }

    async readLoop() {
      const reader = this.session.datagrams.readable.getReader();
      try {
        while (this.readyState === ServerWebTransportSocket.OPEN) {
          const result = await reader.read();
          if (result.done) {
            break;
          }
          const packet = this.reassembler.push(result.value);
          if (packet && packet.byteLength > 0) {
            this.emit("message", packet, true);
          }
        }
      } catch (error) {
        this.fail(error);
      } finally {
        reader.releaseLock();
      }
    }

    send(value) {
      if (this.readyState !== ServerWebTransportSocket.OPEN || !this.writer) {
        throw new Error("WebTransport session is not open");
      }
      const packet = Q3WebTransportFraming.bytes(value).slice();
      const frames = Q3WebTransportFraming.framePacket(packet, this.packetId++, this.datagramBytes);
      this.bufferedAmount += packet.byteLength;
      this.sendChain = this.sendChain.then(async () => {
        for (const frame of frames) {
          await this.writer.write(frame);
        }
      }).catch((error) => this.fail(error)).finally(() => {
        this.bufferedAmount = Math.max(0, this.bufferedAmount - packet.byteLength);
      });
    }

    close() {
      if (this.readyState >= ServerWebTransportSocket.CLOSING) {
        return;
      }
      this.readyState = ServerWebTransportSocket.CLOSING;
      try {
        this.session.close({ closeCode: 0, reason: "Q3JS socket closed" });
      } catch (error) {
        this.fail(error);
      }
    }

    fail(error) {
      if (this.readyState === ServerWebTransportSocket.CLOSED) {
        return;
      }
      // A WebTransport session is only one peer on the engine's shared UDP
      // socket. Do not emit Emscripten's WebSocket-style error event here:
      // that sets sock.error for every peer and makes later sendto calls fail.
      this.finishClose();
    }

    finishClose() {
      if (this.readyState === ServerWebTransportSocket.CLOSED) {
        return;
      }
      this.readyState = ServerWebTransportSocket.CLOSED;
      this.emit("close");
    }
  }

  ServerWebTransportSocket.CONNECTING = 0;
  ServerWebTransportSocket.OPEN = 1;
  ServerWebTransportSocket.CLOSING = 2;
  ServerWebTransportSocket.CLOSED = 3;

  // ioq3ded treats the transport as UDP and can retain a timed-out client for
  // several minutes. Keep its synthetic address reserved for that entire
  // period so late snapshots never fall through to the native UDP socket.
  const CLOSED_ENDPOINT_TTL_MS = 300000;

  function packetBytes(buffer, offset, length) {
    if (ArrayBuffer.isView(buffer)) {
      return new Uint8Array(buffer.buffer, buffer.byteOffset + offset, length).slice();
    }
    return new Uint8Array(buffer.slice(offset, offset + length));
  }

  function syntheticAddress(id) {
    return "100.64." + ((id >>> 8) & 255) + "." + (id & 255);
  }

  function endpointKey(address, port) {
    return address + ":" + port;
  }

  const preRun = Module.preRun || (Module.preRun = []);
  preRun.push(function() {
    patchNodeRawFsCompatibility();
    if (typeof SOCKFS === "undefined" || !SOCKFS.websocket_sock_ops) {
      throw new Error("Q3JS WebTransport requires Emscripten SOCKFS");
    }

    const dgram = require("node:dgram");
    const fs = require("node:fs");
    const crypto = require("node:crypto");
    const sockOps = SOCKFS.websocket_sock_ops;
    const originalCreatePeer = sockOps.createPeer;
    const originalSendmsg = sockOps.sendmsg;
    let nextSessionId = 1;

    sockOps.listen = function(sock) {
      if (sock.server) {
        throw new FS.ErrnoError(28);
      }

      const rawUdp = dgram.createSocket("udp4");
      const state = {
        rawUdp,
        webTransport: null,
        closed: false,
        clients: new Set(),
        webTransportEndpoints: new Map(),
        close: function() {
          if (state.closed) {
            return;
          }
          state.closed = true;
          for (const client of state.clients) {
            client.close();
          }
          state.clients.clear();
          state.webTransportEndpoints.clear();
          try { rawUdp.close(); } catch (_) {}
          if (state.webTransport) {
            try { state.webTransport.stopServer(); } catch (_) {}
          }
        },
      };
      sock.server = state;

      rawUdp.on("message", function(message, remote) {
        sock.recv_queue.push({
          addr: remote.address,
          port: remote.port,
          data: new Uint8Array(message.buffer, message.byteOffset, message.byteLength).slice(),
        });
        SOCKFS.emit("message", sock.stream.fd);
      });
      rawUdp.on("error", function(error) {
        sock.error = 23;
        SOCKFS.emit("error", [sock.stream.fd, sock.error, String(error)]);
      });
      rawUdp.bind(sock.sport, sock.saddr || "0.0.0.0", function() {
        SOCKFS.emit("listen", sock.stream.fd);
      });

      void (async function() {
        const certFile = process.env.Q3JS_TLS_CERT_FILE;
        const keyFile = process.env.Q3JS_TLS_KEY_FILE;
        if (!certFile || !keyFile) {
          throw new Error("Q3JS_TLS_CERT_FILE and Q3JS_TLS_KEY_FILE are required");
        }
        const module = await import("@fails-components/webtransport");
        const webTransportPort = Number.parseInt(process.env.Q3JS_WEBTRANSPORT_PORT || "27961", 10);
        const webTransportHost = process.env.Q3JS_WEBTRANSPORT_HOST || "0.0.0.0";
        const maxConnections = Number.parseInt(process.env.Q3JS_MAX_CONNECTIONS || "128", 10);
        const configuredDatagramBytes = Number.parseInt(
          process.env.Q3JS_WEBTRANSPORT_MAX_DATAGRAM_BYTES || "1000",
          10,
        );
        const allowedOrigins = new Set(
          (process.env.Q3JS_ALLOWED_ORIGINS || "*")
            .split(",")
            .map((origin) => origin.trim())
            .filter(Boolean),
        );
        const server = new module.Http3Server({
          port: webTransportPort,
          host: webTransportHost,
          secret: process.env.Q3JS_WEBTRANSPORT_SECRET || crypto.randomBytes(32).toString("hex"),
          cert: fs.readFileSync(certFile, "utf8"),
          privKey: fs.readFileSync(keyFile, "utf8"),
          maxConnections,
          defaultDatagramsReadableMode: "bytes",
        });
        state.webTransport = server;
        server.setRequestCallback(async function(request) {
          const header = request.header || {};
          if (process.env.Q3JS_WEBTRANSPORT_DEBUG === "1") {
            console.log("Q3JS WebTransport request:", header);
          }
          const origin = String(header.origin || "");
          const url = String(header[":path"] || "");
          const path = url.split("?", 1)[0];
          if (path !== "/wt") {
            return { status: 404, path, header: { ...header, ":path": path } };
          }
          if (origin && !allowedOrigins.has("*") && !allowedOrigins.has(origin)) {
            return { status: 403, path, header: { ...header, ":path": path } };
          }
          return {
            status: 200,
            path: "/wt",
            header: { ...header, ":path": "/wt" },
            userData: {},
          };
        });
        const sessions = server.sessionStream("/wt");
        server.startServer();
        await server.ready;
        console.log("Q3JS WebTransport listening on https://" + webTransportHost + ":" + webTransportPort + "/wt");

        const sessionReader = sessions.getReader();
        while (!state.closed) {
          const result = await sessionReader.read();
          if (result.done) {
            break;
          }
          if (state.clients.size >= maxConnections) {
            result.value.close({ closeCode: 1, reason: "Server is full" });
            continue;
          }
          let sessionId;
          let remoteAddress;
          let remotePort;
          let key;
          for (let attempt = 0; attempt < 65535; attempt += 1) {
            sessionId = nextSessionId++ & 0xffff;
            if (sessionId === 0) {
              continue;
            }
            remoteAddress = syntheticAddress(sessionId);
            remotePort = 10000 + (sessionId % 50000);
            key = endpointKey(remoteAddress, remotePort);
            const existing = state.webTransportEndpoints.get(key);
            if (existing === undefined || (existing !== Infinity && existing <= Date.now())) {
              break;
            }
            key = undefined;
          }
          if (!key) {
            result.value.close({ closeCode: 1, reason: "No client address is available" });
            continue;
          }
          state.webTransportEndpoints.set(key, Infinity);
          const socket = new ServerWebTransportSocket(
            result.value,
            remoteAddress,
            remotePort,
            configuredDatagramBytes,
          );
          let peer;
          state.clients.add(socket);
          socket.on("close", function() {
            state.clients.delete(socket);
            if (peer && sockOps.getPeer(sock, peer.addr, peer.port) === peer) {
              sockOps.removePeer(sock, peer);
            }
            const expiresAt = Date.now() + CLOSED_ENDPOINT_TTL_MS;
            state.webTransportEndpoints.set(key, expiresAt);
            setTimeout(function() {
              if (state.webTransportEndpoints.get(key) === expiresAt) {
                state.webTransportEndpoints.delete(key);
              }
            }, CLOSED_ENDPOINT_TTL_MS);
          });

          const sourcePort = sock.sport;
          delete sock.sport;
          try {
            peer = originalCreatePeer.call(sockOps, sock, socket);
          } finally {
            sock.sport = sourcePort;
          }
          SOCKFS.emit("connection", sock.stream.fd);
        }
      })().catch(function(error) {
        console.error("Q3JS WebTransport failed:", error);
        state.close();
        process.exitCode = 1;
        setTimeout(function() { process.exit(1); }, 0);
      });
    };

    sockOps.sendmsg = function(sock, buffer, offset, length, addr, port) {
      if (sock.type === 2 && addr !== undefined && port !== undefined) {
        const peer = this.getPeer(sock, addr, port);
        if (peer && peer.socket instanceof ServerWebTransportSocket) {
          // SOCKFS normally reconnects a closed datagram peer. Its reconnect
          // path assumes WebSockets and attempts to dial the peer's synthetic
          // address, producing an EHOSTUNREACH error for every snapshot.
          if (peer.socket.readyState !== ServerWebTransportSocket.OPEN) {
            return length;
          }
          const data = packetBytes(buffer, offset, length);
          try {
            peer.socket.send(data);
          } catch (error) {
            peer.socket.fail(error);
          }
          return length;
        }
        if (!peer) {
          const key = endpointKey(addr, port);
          const endpointExpiry = sock.server && sock.server.webTransportEndpoints.get(key);
          if (endpointExpiry !== undefined) {
            if (endpointExpiry === Infinity || endpointExpiry > Date.now()) {
              return length;
            }
            sock.server.webTransportEndpoints.delete(key);
          }
          const data = packetBytes(buffer, offset, length);
          if (!sock.server || !sock.server.rawUdp) {
            throw new FS.ErrnoError(17);
          }
          sock.server.rawUdp.send(data, port, addr, function(error) {
            // UDP delivery errors belong to this datagram, not to the shared
            // engine socket. sendto has already accepted the packet.
            if (error && process.env.Q3JS_WEBTRANSPORT_DEBUG === "1") {
              console.warn("Q3JS UDP send failed:", String(error));
            }
          });
          return length;
        }
      }
      return originalSendmsg.call(this, sock, buffer, offset, length, addr, port);
    };

    sockOps.close = function(sock) {
      if (sock.server) {
        sock.server.close();
        sock.server = null;
      }
      for (const peer of Object.values(sock.peers)) {
        try { peer.socket.close(); } catch (_) {}
        this.removePeer(sock, peer);
      }
      return 0;
    };
  });
})();
