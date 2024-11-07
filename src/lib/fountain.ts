import type { QRCode } from "jsqr";

/**
 * Runs bitwise xor on each corresponding value in the two provided arrays,
 * updating the first array in-place.
 */
export function xor(inplace: Uint8Array, other: Uint8Array) {
  const minLength = Math.min(inplace.length, other.length);
  for (let i = 0; i < minLength; i++) {
    inplace[i] ^= other[i];
  }
}

export class FountainEncoder {
  /** The list of source blocks. */
  readonly blocks: Uint8Array[];

  private readonly textEncoder = new TextEncoder();

  /** Discrete probability distribution. */
  private readonly distribution: number[];

  constructor(message: string, blockSize: number, distribution: "robust" | "ideal" = "robust") {
    const textEncoder = new TextEncoder();
    let data = textEncoder.encode(message);

    const blocksNeeded = Math.ceil(data.length / blockSize);

    const blocks: Uint8Array[] = [];

    for (let i = 0; i < blocksNeeded; i++) {
      const start = i * blockSize;
      const end = start + blockSize;
      const block = data.subarray(start, end);

      blocks.push(block);
    }

    this.blocks = blocks;

    if (distribution == "ideal") {
      this.distribution = idealDistribution(this.blocks.length);
    } else {
      this.distribution = robustDistribution(this.blocks.length, 0.2);
    }
  }

  /** Randomly assembles an encoded block from the source blocks. */
  encode() {
    let blocksToEncode = 1;

    if (this.blocks.length > 1) {
      const random = Math.random();

      for (let i = 1; i <= this.blocks.length; i++) {
        if (this.distribution[i] > random) {
          blocksToEncode = i;
          break;
        }
      }
    }

    const ids: number[] = [];
    const sourceBlocks: Uint8Array[] = [];

    for (let i = 0; i < blocksToEncode; i++) {
      let id = -1;

      do {
        id = Math.floor(Math.random() * this.blocks.length);
      } while (ids.includes(id));

      ids.push(id);
      sourceBlocks.push(this.blocks[id]);
    }

    let blockSize = 0;
    for (const block of this.blocks) {
      blockSize = Math.max(block.length, blockSize);
    }

    const data = new Uint8Array(blockSize);

    for (const block of sourceBlocks) {
      xor(data, block);
    }

    ids.sort((a, b) => a - b);

    const header = this.textEncoder.encode(`${this.blocks.length},${ids.join(",")}|`);

    const block = new Uint8Array(header.length + data.length);
    block.set(header);
    block.set(data, header.length);

    return block;
  }
}

// https://github.com/google/gofountain/blob/master/util.go#L34
function idealDistribution(n: number): number[] {
  const idealDist = [0, 1 / n];

  for (let i = 2; i <= n; i++) {
    idealDist[i] = idealDist[i - 1] * (1 / (i * i - 1));
  }

  return idealDist;
}

// https://github.com/google/gofountain/blob/master/util.go#L54
function robustDistribution(n: number, errorRate: number): number[] {
  const m = n - n * errorRate;

  const pdf = [0, 1 / n + 1 / m];

  let total = pdf[1];

  for (let i = 2; i <= n; i++) {
    pdf[i] = 1 / (i * i - 1);

    if (i < m) {
      pdf[i] += 1 / (i * m);
    }

    if (i == m) {
      pdf[i] += Math.log(n / (m * errorRate)) / m;
    }

    total += pdf[i];
  }

  const robustDist: number[] = [0];

  for (let i = 1; i < pdf.length; i++) {
    pdf[i] /= total;
    robustDist[i] = robustDist[i - 1] + pdf[i];
  }

  return robustDist;
}

export type EncodedBlock = {
  ids: number[];
  data: Uint8Array;
};

export class FountainDecoder {
  /** Contains encoded blocks at various stages of decoding. */
  private readonly buffer: EncodedBlock[];

  /** Fully decoded blocks at their original source indexes. */
  private readonly decoded: Map<number, Uint8Array>;

  private lastHeader: string;

  /** Run as soon as all blocks have been decoded. */
  ondecode: ((message: string) => void) | undefined;

  constructor() {
    this.buffer = [];
    this.decoded = new Map<number, Uint8Array>();
    this.lastHeader = "";
    this.ondecode = undefined;
  }

  decode(code: QRCode) {
    const [headerString] = code.data.split("|", 1);

    if (this.lastHeader == headerString || !headerString.length) {
      return;
    }

    this.lastHeader = headerString;

    const headerData = headerString.split(",").map((data) => Number(data));
    const totalSources = headerData[0];
    let ids = headerData.slice(1);

    const data = new Uint8Array(code.binaryData.slice(headerString.length + 1));

    if (!ids.length || ids.length > totalSources) {
      return;
    }

    if (ids.every((id) => this.decoded.has(id))) {
      return;
    }

    if (ids.length > 1) {
      for (const id of ids) {
        const decodedBlock = this.decoded.get(id);
        if (!decodedBlock) {
          continue;
        }

        xor(data, decodedBlock);
      }

      ids = ids.filter((id) => !this.decoded.has(id));
    }

    if (ids.length == 1) {
      const id = ids[0];
      this.decoded.set(id, data);
      this.decodeBufferWithId(id);
    } else {
      this.buffer.push({ ids, data });
    }

    if (totalSources == this.decoded.size) {
      this.constructMessage();
    }
  }

  /** Recursively decodes the buffer as much as possible using the newly decoded block id. */
  private decodeBufferWithId(decodedId: number) {
    const decodedData = this.decoded.get(decodedId);
    if (!decodedData) {
      return;
    }

    for (const block of this.buffer) {
      if (block.ids.length == 1 || !block.ids.includes(decodedId)) {
        continue;
      }

      xor(block.data, decodedData);
      block.ids = block.ids.filter((id) => id != decodedId);

      if (block.ids.length > 1) {
        continue;
      }

      const id = block.ids[0];
      this.decoded.set(id, block.data);
      this.decodeBufferWithId(id);
    }
  }

  /** Runs once decoding is complete. */
  private constructMessage() {
    let messageLength = 0;
    const decoded = [...this.decoded].toSorted(([a], [b]) => a - b).map(([_, data]) => data);
    for (const data of decoded) {
      messageLength += data.length;
    }

    let messageData = new Uint8Array(messageLength);

    let offset = 0;
    for (const data of decoded) {
      messageData.set(data, offset);
      offset += data.length;
    }

    const end = messageData.findIndex((byte) => byte == 0);
    if (end > -1) {
      messageData = messageData.subarray(0, end);
    }

    const textDecoder = new TextDecoder();
    const message = textDecoder.decode(messageData);

    this.ondecode?.(message);
  }
}
