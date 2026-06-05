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
  return Uint8Array.from(await new Response(compressedStream).bytes());
}

export async function decompress(data: Uint8Array<ArrayBuffer>) {
  if (!supportsCompressionApi) {
    throw new Error("Device does not support Compression Stream API");
  }

  const stream = new Blob([data]).stream();
  const decompressedStream = stream.pipeThrough(new DecompressionStream(method));
  return await new Response(decompressedStream).text();
}
