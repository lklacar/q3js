(function() {
  "use strict";

  class BrowserWebTransportSocket {
    constructor(url, options) {
      this.url = url;
      this.binaryType = "arraybuffer";
      this.readyState = BrowserWebTransportSocket.CONNECTING;
      this.bufferedAmount = 0;
      this.CONNECTING = BrowserWebTransportSocket.CONNECTING;
      this.OPEN = BrowserWebTransportSocket.OPEN;
      this.CLOSING = BrowserWebTransportSocket.CLOSING;
      this.CLOSED = BrowserWebTransportSocket.CLOSED;
      this.onopen = null;
      this.onclose = null;
      this.onmessage = null;
      this.onerror = null;
      this.packetId = 0;
      this.reassembler = new Q3WebTransportFraming.Reassembler();
      this.sendChain = Promise.resolve();

      const transportOptions = {
        congestionControl: "low-latency",
        requireUnreliable: true,
      };
      if (options && options.serverCertificateHashes) {
        transportOptions.serverCertificateHashes = options.serverCertificateHashes;
      }
      this.transport = new WebTransport(url, transportOptions);
      this.transport.ready.then(() => this.handleReady()).catch((error) => this.fail(error));
      this.transport.closed.then(
        () => this.finishClose(),
        (error) => this.fail(error),
      );
    }

    async handleReady() {
      if (this.readyState !== BrowserWebTransportSocket.CONNECTING) {
        return;
      }
      this.datagramBytes = Q3WebTransportFraming.datagramLimit(
        this.transport.datagrams,
        Module.webtransport && Module.webtransport.maxDatagramBytes,
      );
      this.writer = Q3WebTransportFraming.writableFor(this.transport.datagrams).getWriter();
      this.readyState = BrowserWebTransportSocket.OPEN;
      this.onopen && this.onopen();
      void this.readLoop();
    }

    async readLoop() {
      const reader = this.transport.datagrams.readable.getReader();
      try {
        while (this.readyState === BrowserWebTransportSocket.OPEN) {
          const result = await reader.read();
          if (result.done) {
            break;
          }
          const packet = this.reassembler.push(result.value);
          if (packet && packet.byteLength > 0) {
            this.onmessage && this.onmessage({ data: packet.buffer });
          }
        }
      } catch (error) {
        this.fail(error);
      } finally {
        reader.releaseLock();
      }
    }

    send(value) {
      if (this.readyState !== BrowserWebTransportSocket.OPEN || !this.writer) {
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
      if (this.readyState >= BrowserWebTransportSocket.CLOSING) {
        return;
      }
      this.readyState = BrowserWebTransportSocket.CLOSING;
      try {
        this.transport.close({ closeCode: 0, reason: "Q3JS socket closed" });
      } catch (error) {
        this.fail(error);
      }
    }

    fail(error) {
      if (this.readyState === BrowserWebTransportSocket.CLOSED) {
        return;
      }
      this.onerror && this.onerror(error);
      this.finishClose();
    }

    finishClose() {
      if (this.readyState === BrowserWebTransportSocket.CLOSED) {
        return;
      }
      this.readyState = BrowserWebTransportSocket.CLOSED;
      this.onclose && this.onclose();
    }
  }

  BrowserWebTransportSocket.CONNECTING = 0;
  BrowserWebTransportSocket.OPEN = 1;
  BrowserWebTransportSocket.CLOSING = 2;
  BrowserWebTransportSocket.CLOSED = 3;

  const preRun = Module.preRun || (Module.preRun = []);
  preRun.push(function() {
    const configured = Module.webtransport;
    // Keep Emscripten's built-in WebSocket SOCKFS backend for legacy servers.
    // Supplying Module.webtransport is the explicit opt-in to this adapter.
    if (!configured) {
      return;
    }
    if (typeof SOCKFS === "undefined" || !SOCKFS.websocket_sock_ops) {
      throw new Error("Q3JS WebTransport requires Emscripten SOCKFS");
    }
    if (typeof WebTransport === "undefined") {
      throw new Error("This browser does not support WebTransport");
    }
    if (!configured.url || !String(configured.url).startsWith("https://")) {
      throw new Error("Q3JS WebTransport URL must use https://");
    }

    const sockOps = SOCKFS.websocket_sock_ops;
    const originalCreatePeer = sockOps.createPeer;
    sockOps.createPeer = function(sock, addr, port) {
      if (typeof addr === "object") {
        return originalCreatePeer.call(this, sock, addr, port);
      }
      const socket = new BrowserWebTransportSocket(configured.url, configured);
      socket._socket = { remoteAddress: addr, remotePort: port };
      const sourcePort = sock.sport;
      delete sock.sport;
      try {
        return originalCreatePeer.call(this, sock, socket);
      } finally {
        if (sourcePort !== undefined) {
          sock.sport = sourcePort;
        }
      }
    };
  });
})();
