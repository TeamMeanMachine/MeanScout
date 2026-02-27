<script lang="ts">
  import { LoaderIcon } from "@lucide/svelte";
  import { decompress } from "$lib/compress";
  import { FountainDecoder } from "$lib/fountain";
  import { cameraStore } from "$lib/settings";
  import jsQR from "jsqr";
  import { onDestroy, onMount } from "svelte";

  let {
    onread,
  }: {
    onread: (data: string) => void;
  } = $props();

  // Using the experimental BarcodeDetector API resulted in issues when sharing between Apple and Android devices.
  // For now, we just use a library to scan QR codes.
  let reader = $state<{ using: "library"; canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } | undefined>();

  let reading = $state(false);
  let scanned = $state<number[] | string>("--");
  let decodedCount = $state(0);
  let totalCount = $state(0);

  let video: HTMLVideoElement | undefined = undefined;
  let stream: MediaStream;
  let cameras = $state<{ id: string; name: string }[]>([]);
  let noCamera = $state(false);

  let fountainDecoder: FountainDecoder;

  onMount(async () => {
    const canvas = document.createElement("canvas");
    reader = {
      using: "library",
      canvas,
      context: canvas.getContext("2d", { willReadFrequently: true })!,
    };

    fountainDecoder = new FountainDecoder();
    fountainDecoder.ondecode = (message) => {
      stop();
      decompress(message)
        .then((data) => onread(data || new TextDecoder().decode(message)))
        .catch(() => onread(new TextDecoder().decode(message)));
    };

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: $cameraStore ? { exact: $cameraStore } : undefined,
        aspectRatio: { ideal: 1 },
      },
      audio: false,
    });

    const devices = await navigator.mediaDevices.enumerateDevices();

    cameras = devices
      .filter((device) => device.kind == "videoinput" && device.label.trim())
      .map((device) => ({ id: device.deviceId, name: device.label.trim() }))
      .toSorted((a, b) => a.name.localeCompare(b.name, "en"));

    // QRCodeReader might be destroyed while we're getting user media.
    if (!video) {
      stop();
      return;
    }

    video.srcObject = stream;
    reading = true;

    if ("requestVideoFrameCallback" in video) {
      video.requestVideoFrameCallback(update);
    } else {
      requestAnimationFrame(update);
    }
  });

  onDestroy(stop);

  async function changeCamera() {
    stop();

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: $cameraStore ? { exact: $cameraStore } : undefined,
        aspectRatio: { ideal: 1 },
      },
      audio: false,
    });

    reading = true;

    if (video) {
      video.srcObject = stream;

      if ("requestVideoFrameCallback" in video) {
        video.requestVideoFrameCallback(update);
      } else {
        requestAnimationFrame(update);
      }
    }
  }

  async function update() {
    if (!reading || !video) return;
    scanned = "--";

    if (video.readyState == video.HAVE_ENOUGH_DATA) {
      if (reader) {
        reader.canvas.width = video.videoWidth;
        reader.canvas.height = video.videoHeight;
        reader.context.drawImage(video, 0, 0, reader.canvas.width, reader.canvas.height);
        const image = reader.context.getImageData(0, 0, reader.canvas.width, reader.canvas.height);
        const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
        if (code) {
          scanned = fountainDecoder.decode(code.binaryData) ?? "skip";
          decodedCount = fountainDecoder.decoded.size;
          if (!totalCount) totalCount = fountainDecoder.getTotalSources();
        }
      }
    }

    if ("requestVideoFrameCallback" in video) {
      video.requestVideoFrameCallback(update);
    } else {
      requestAnimationFrame(update);
    }
  }

  function stop() {
    reading = false;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  }
</script>

<video bind:this={video} autoplay playsinline muted class={reading ? "block" : "hidden"}></video>

{#if cameras.length}
  <select bind:value={$cameraStore} onchange={changeCamera} class="bg-neutral-800 p-2 text-theme capitalize">
    <option value="">Default</option>
    {#each cameras as { id, name }}
      <option value={id}>{name}</option>
    {/each}
  </select>
{:else if noCamera}
  <span class="text-sm font-light">No camera</span>
{:else}
  <LoaderIcon class="animate-spin text-theme" />
{/if}

<div class="flex flex-wrap gap-x-4 gap-y-2 truncate text-sm text-nowrap">
  <div class="flex grow basis-0 flex-col text-sm">
    <span>scanned: {scanned}</span>
    <span>decoded: {decodedCount}/{totalCount}</span>
  </div>
</div>
