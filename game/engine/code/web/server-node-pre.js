(function() {
  function normalizePeerAddress(addr) {
    if (typeof addr !== "string" || !addr.includes(":")) {
      return addr;
    }

    if (addr === "::1") {
      return "127.0.0.1";
    }

    if (addr.startsWith("::ffff:")) {
      const mapped = addr.substring("::ffff:".length);
      if (/^\d+\.\d+\.\d+\.\d+$/.test(mapped)) {
        return mapped;
      }
    }

    // Emscripten's SOCKFS datagram sockets are AF_INET-only, but Node's
    // WebSocket server can surface IPv6 peer addresses. Convert those to a
    // stable non-IP token so DNS.lookup_name/lookup_addr round-trip through
    // SOCKFS and subsequent sendto() calls reuse the existing peer.
    return "wspeer-" + addr.replace(/[^0-9A-Za-z_.-]/g, "_");
  }

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
        // NODERAWFS creates stdin without stream ops, but musl's select()/poll()
        // still touches fd 0 on the dedicated server path. Provide a minimal
        // inert stdin stream so the server can keep running headless.
        stdin.stream_ops = {
          close: function() {},
          fsync: function() {},
          ioctl: function() {
            throw new FS.ErrnoError(59);
          },
          poll: function() {
            return 0;
          },
          read: function() {
            return 0;
          }
        };
      }

      return result;
    };
  }

  const preRun = Module.preRun || (Module.preRun = []);
  preRun.push(function() {
    patchNodeRawFsCompatibility();

    if (typeof SOCKFS === "undefined" || !SOCKFS.websocket_sock_ops) {
      return;
    }

    const sockOps = SOCKFS.websocket_sock_ops;
    if (sockOps.__ioq3PeerAddressPatchApplied) {
      return;
    }
    sockOps.__ioq3PeerAddressPatchApplied = true;

    const createPeer = sockOps.createPeer;
    sockOps.createPeer = function(sock, addr, port) {
      const peer = createPeer.call(this, sock, addr, port);
      const normalizedAddr = normalizePeerAddress(peer.addr);

      if (normalizedAddr !== peer.addr) {
        this.removePeer(sock, peer);
        peer.addr = normalizedAddr;
        this.addPeer(sock, peer);
      }

      return peer;
    };
  });
})();
