(function() {
  "use strict";

  const HEADER_BYTES = 12;
  const MAGIC = 0x51335754; // Q3WT
  const DEFAULT_DATAGRAM_BYTES = 1000;
  const MAX_FRAGMENT_COUNT = 64;
  const MAX_PACKET_BYTES = 65535;
  const REASSEMBLY_TIMEOUT_MS = 2000;

  function bytes(value) {
    if (value instanceof Uint8Array) {
      return value;
    }
    if (ArrayBuffer.isView(value)) {
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    return new Uint8Array(value);
  }

  function datagramLimit(datagrams, configuredLimit) {
    const advertised = Number(datagrams && datagrams.maxDatagramSize);
    const configured = Number(configuredLimit);
    const candidates = [DEFAULT_DATAGRAM_BYTES];
    if (Number.isFinite(advertised) && advertised > HEADER_BYTES) {
      candidates.push(advertised);
    }
    if (Number.isFinite(configured) && configured > HEADER_BYTES) {
      candidates.push(configured);
    }
    return Math.max(HEADER_BYTES + 1, Math.min.apply(Math, candidates));
  }

  function framePacket(packet, packetId, maxDatagramBytes) {
    const source = bytes(packet);
    if (source.byteLength > MAX_PACKET_BYTES) {
      throw new RangeError("Q3JS packet exceeds 65535 bytes");
    }
    const payloadBytes = Math.max(1, maxDatagramBytes - HEADER_BYTES);
    const fragmentCount = Math.max(1, Math.ceil(source.byteLength / payloadBytes));
    if (fragmentCount > MAX_FRAGMENT_COUNT) {
      throw new RangeError("Q3JS packet requires too many WebTransport datagrams");
    }

    const frames = [];
    for (let index = 0; index < fragmentCount; index += 1) {
      const start = index * payloadBytes;
      const end = Math.min(source.byteLength, start + payloadBytes);
      const frame = new Uint8Array(HEADER_BYTES + end - start);
      const view = new DataView(frame.buffer);
      view.setUint32(0, MAGIC);
      view.setUint32(4, packetId >>> 0);
      view.setUint16(8, index);
      view.setUint16(10, fragmentCount);
      frame.set(source.subarray(start, end), HEADER_BYTES);
      frames.push(frame);
    }
    return frames;
  }

  class Reassembler {
    constructor() {
      this.pending = new Map();
    }

    push(value) {
      const frame = bytes(value);
      if (frame.byteLength < HEADER_BYTES) {
        return null;
      }
      const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
      if (view.getUint32(0) !== MAGIC) {
        return null;
      }
      const packetId = view.getUint32(4);
      const index = view.getUint16(8);
      const count = view.getUint16(10);
      if (count < 1 || count > MAX_FRAGMENT_COUNT || index >= count) {
        return null;
      }

      const now = Date.now();
      for (const [id, packet] of this.pending) {
        if (now - packet.updatedAt > REASSEMBLY_TIMEOUT_MS) {
          this.pending.delete(id);
        }
      }

      let packet = this.pending.get(packetId);
      if (!packet || packet.count !== count) {
        packet = { count, fragments: new Array(count), received: 0, total: 0, updatedAt: now };
        this.pending.set(packetId, packet);
      }
      packet.updatedAt = now;
      if (!packet.fragments[index]) {
        const payload = frame.slice(HEADER_BYTES);
        packet.fragments[index] = payload;
        packet.received += 1;
        packet.total += payload.byteLength;
      }
      if (packet.total > MAX_PACKET_BYTES) {
        this.pending.delete(packetId);
        return null;
      }
      if (packet.received !== packet.count) {
        return null;
      }

      const result = new Uint8Array(packet.total);
      let offset = 0;
      for (const fragment of packet.fragments) {
        result.set(fragment, offset);
        offset += fragment.byteLength;
      }
      this.pending.delete(packetId);
      return result;
    }
  }

  function writableFor(datagrams) {
    if (typeof datagrams.createWritable === "function") {
      return datagrams.createWritable();
    }
    if (datagrams.writable) {
      return datagrams.writable;
    }
    throw new Error("WebTransport datagram writes are unavailable");
  }

  globalThis.Q3WebTransportFraming = {
    Reassembler,
    bytes,
    datagramLimit,
    framePacket,
    writableFor,
  };
})();
