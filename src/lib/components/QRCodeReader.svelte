<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { FountainDecoder } from "$lib/fountain";
  import { cameraStore } from "$lib/settings";
  import jsQR from "jsqr";

  let {
    onread,
  }: {
    onread: (data: Uint8Array) => void;
  } = $props();

  // Using the experimental BarcodeDetector API resulted in issues when sharing between Apple and Android devices.
  // For now, we just use a library to scan QR codes.
  let reader = $state<{ using: "library"; canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } | undefined>();

  let reading = $state(false);
  let scanned = $state<number[] | string>("--");

  let video: HTMLVideoElement;
  let stream: MediaStream;
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
      onread(message);
    };

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: $cameraStore ? { exact: $cameraStore } : undefined,
        aspectRatio: { ideal: 1 },
      },
      audio: false,
    });

    video.srcObject = stream;

    reading = true;

    if ("requestVideoFrameCallback" in video) {
      video.requestVideoFrameCallback(update);
    } else {
      requestAnimationFrame(update);
    }
  });

  onDestroy(() => stop());

  async function update() {
    if (!reading) return;
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
        }
      }
    }

    if (!reading) return;
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

<video bind:this={video} autoplay muted class={reading ? "block" : "hidden"}></video>
<span class="overflow-hidden overflow-ellipsis whitespace-nowrap text-nowrap">scanned: {scanned}</span>
