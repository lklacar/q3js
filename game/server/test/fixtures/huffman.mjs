const NOT_YET_TRANSMITTED = 256;
const INTERNAL_NODE = 257;
function node(symbol, weight) {
  return {
    left: null,
    right: null,
    parent: null,
    next: null,
    previous: null,
    head: null,
    weight,
    symbol
  };
}
class BitReader {
  constructor(bytes) {
    this.bytes = bytes;
  }
  #offset = 16;
  read() {
    if (this.#offset >= this.bytes.byteLength * 8) {
      throw new Error("Truncated Huffman data.");
    }
    const byte = this.bytes[this.#offset >> 3];
    if (byte === void 0) {
      throw new Error("Truncated Huffman data.");
    }
    const bit = byte >> (this.#offset & 7) & 1;
    this.#offset++;
    return bit;
  }
}
class BitWriter {
  #offset = 16;
  #bytes;
  constructor(inputBytes) {
    this.#bytes = Buffer.alloc(Math.max(32, inputBytes * 4 + 2));
    this.#bytes[0] = inputBytes >> 8;
    this.#bytes[1] = inputBytes & 255;
  }
  write(bit) {
    const byteOffset = this.#offset >> 3;
    if (byteOffset >= this.#bytes.byteLength) {
      const expanded = Buffer.alloc(this.#bytes.byteLength * 2);
      this.#bytes.copy(expanded);
      this.#bytes = expanded;
    }
    if (bit !== 0) {
      this.#bytes[byteOffset] = (this.#bytes[byteOffset] ?? 0) | 1 << (this.#offset & 7);
    }
    this.#offset++;
  }
  finish() {
    return this.#bytes.subarray(0, this.#offset + 8 >> 3);
  }
}
class AdaptiveHuffmanTree {
  #locations = Array(257).fill(null);
  #freeHeads = [];
  #notYetTransmitted = node(NOT_YET_TRANSMITTED, 0);
  #tree = this.#notYetTransmitted;
  #listHead = this.#notYetTransmitted;
  constructor() {
    this.#locations[NOT_YET_TRANSMITTED] = this.#notYetTransmitted;
  }
  receive(reader) {
    let current = this.#tree;
    while (current?.symbol === INTERNAL_NODE) {
      current = reader.read() === 0 ? current.left : current.right;
    }
    if (!current) {
      throw new Error("Invalid Huffman tree path.");
    }
    return current.symbol;
  }
  transmit(symbol, writer) {
    const existing = this.#locations[symbol];
    if (!existing) {
      this.transmit(NOT_YET_TRANSMITTED, writer);
      for (let bit = 7; bit >= 0; bit--) {
        writer.write(symbol >> bit & 1);
      }
      return;
    }
    this.#send(existing, writer);
  }
  addReference(symbol) {
    const existing = this.#locations[symbol];
    if (existing) {
      this.#increment(existing);
      return;
    }
    const internal = node(INTERNAL_NODE, 1);
    internal.next = this.#listHead.next;
    if (this.#listHead.next) {
      this.#listHead.next.previous = internal;
      if (this.#listHead.next.weight === 1) {
        internal.head = this.#listHead.next.head;
      } else {
        internal.head = this.#allocateHead(internal);
      }
    } else {
      internal.head = this.#allocateHead(internal);
    }
    this.#listHead.next = internal;
    internal.previous = this.#listHead;
    const leaf = node(symbol, 1);
    leaf.next = this.#listHead.next;
    if (this.#listHead.next) {
      this.#listHead.next.previous = leaf;
      if (this.#listHead.next.weight === 1) {
        leaf.head = this.#listHead.next.head;
      } else {
        leaf.head = this.#allocateHead(internal);
      }
    } else {
      leaf.head = this.#allocateHead(leaf);
    }
    this.#listHead.next = leaf;
    leaf.previous = this.#listHead;
    const oldParent = this.#listHead.parent;
    if (oldParent) {
      if (oldParent.left === this.#listHead) {
        oldParent.left = internal;
      } else {
        oldParent.right = internal;
      }
    } else {
      this.#tree = internal;
    }
    internal.right = leaf;
    internal.left = this.#listHead;
    internal.parent = oldParent;
    this.#listHead.parent = internal;
    leaf.parent = internal;
    this.#locations[symbol] = leaf;
    this.#increment(internal.parent);
  }
  #allocateHead(value) {
    const head = this.#freeHeads.pop() ?? { node: null };
    head.node = value;
    return head;
  }
  #releaseHead(head) {
    head.node = null;
    this.#freeHeads.push(head);
  }
  #send(current, writer) {
    if (current.parent) {
      this.#send(current.parent, writer);
      writer.write(current.parent.right === current ? 1 : 0);
    }
  }
  #swap(first, second) {
    const firstParent = first.parent;
    const secondParent = second.parent;
    if (firstParent) {
      if (firstParent.left === first) {
        firstParent.left = second;
      } else {
        firstParent.right = second;
      }
    } else {
      this.#tree = second;
    }
    if (secondParent) {
      if (secondParent.left === second) {
        secondParent.left = first;
      } else {
        secondParent.right = first;
      }
    } else {
      this.#tree = first;
    }
    first.parent = secondParent;
    second.parent = firstParent;
  }
  #swapList(first, second) {
    let temporary = first.next;
    first.next = second.next;
    second.next = temporary;
    temporary = first.previous;
    first.previous = second.previous;
    second.previous = temporary;
    if (first.next === first) {
      first.next = second;
    }
    if (second.next === second) {
      second.next = first;
    }
    if (first.next) {
      first.next.previous = first;
    }
    if (second.next) {
      second.next.previous = second;
    }
    if (first.previous) {
      first.previous.next = first;
    }
    if (second.previous) {
      second.previous.next = second;
    }
  }
  #increment(current) {
    if (!current) {
      return;
    }
    if (current.next && current.next.weight === current.weight) {
      const highest = current.head?.node;
      if (!highest) {
        throw new Error("Invalid Huffman weight block.");
      }
      if (highest !== current.parent) {
        this.#swap(highest, current);
      }
      this.#swapList(highest, current);
    }
    const oldHead = current.head;
    if (!oldHead) {
      throw new Error("Invalid Huffman node head.");
    }
    if (current.previous?.weight === current.weight) {
      oldHead.node = current.previous;
    } else {
      this.#releaseHead(oldHead);
    }
    current.weight++;
    if (current.next?.weight === current.weight) {
      current.head = current.next.head;
    } else {
      current.head = this.#allocateHead(current);
    }
    if (current.parent) {
      this.#increment(current.parent);
      if (current.previous === current.parent) {
        this.#swapList(current, current.parent);
        if (current.head?.node === current) {
          current.head.node = current.parent;
        }
      }
    }
  }
}
function decompressHuffman(input, maxOutputBytes = 65535) {
  if (input.byteLength < 2) {
    throw new Error("Huffman data is missing its length header.");
  }
  const outputLength = input[0] * 256 + input[1];
  if (outputLength > maxOutputBytes) {
    throw new Error("Huffman output exceeds the configured packet limit.");
  }
  const reader = new BitReader(input);
  const tree = new AdaptiveHuffmanTree();
  const output = Buffer.alloc(outputLength);
  for (let index = 0; index < outputLength; index++) {
    let symbol = tree.receive(reader);
    if (symbol === NOT_YET_TRANSMITTED) {
      symbol = 0;
      for (let bit = 0; bit < 8; bit++) {
        symbol = symbol << 1 | reader.read();
      }
    }
    output[index] = symbol;
    tree.addReference(symbol);
  }
  return output;
}
function compressHuffman(input) {
  if (input.byteLength > 65535) {
    throw new Error("Huffman input exceeds the 16-bit length limit.");
  }
  if (input.byteLength === 0) {
    return Buffer.alloc(0);
  }
  const writer = new BitWriter(input.byteLength);
  const tree = new AdaptiveHuffmanTree();
  for (const symbol of input) {
    tree.transmit(symbol, writer);
    tree.addReference(symbol);
  }
  return writer.finish();
}
export {
  compressHuffman,
  decompressHuffman
};
