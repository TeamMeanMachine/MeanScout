import { browser } from "$app/environment";

const method: CompressionFormat = "deflate-raw";

export const supportsCompressionApi = browser && "CompressionStream" in window && "DecompressionStream" in window;

export async function compress(data: string) {
  if (!supportsCompressionApi) {
    throw new Error("Device does not support Compression Stream API");
  }

  const bytes = new TextEncoder().encode(data);
  const stream = new Blob([bytes]).stream();
  const compressedStream = stream.pipeThrough(new CompressionStream(method));
  return await getDataFromStream(compressedStream);
}

export async function decompress(data: Uint8Array) {
  if (!supportsCompressionApi) {
    throw new Error("Device does not support Compression Stream API");
  }

  const stream = new Blob([data]).stream();
  const decompressedStream = stream.pipeThrough(new DecompressionStream(method));
  const bytes = await getDataFromStream(decompressedStream);
  return new TextDecoder().decode(bytes);
}

async function getDataFromStream(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  async function process({ done, value }: ReadableStreamReadResult<Uint8Array>): Promise<Uint8Array> {
    if (done) {
      return new Uint8Array(await new Blob(chunks).arrayBuffer());
    }

    chunks.push(value);

    // The compression/decompression stream throws an error if it finds junk data at the end.
    // We have to catch it and just return the chunks we have up to this point.
    try {
      const result = await reader.read();
      return await process(result);
    } catch {
      return new Uint8Array(await new Blob(chunks).arrayBuffer());
    }
  }

  try {
    const result = await reader.read();
    return await process(result);
  } catch {
    return new Uint8Array(await new Blob(chunks).arrayBuffer());
  }
}
