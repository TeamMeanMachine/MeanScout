<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { FountainDecoder } from "$lib/fountain";
  import { cameraStore } from "$lib/settings";
  import jsQR from "jsqr";

  let {
    onread,
  }: {
    onread: (data: string) => void;
  } = $props();

  let reader = $state<
    | { using: "api"; detector: BarcodeDetector }
    | { using: "library"; canvas: HTMLCanvasElement; context: CanvasRenderingContext2D }
    | undefined
  >();

  let reading = $state(false);
  let scanned = $state<number[] | string>("--");
  let textEncoder = new TextEncoder();

  let video: HTMLVideoElement;
  let stream: MediaStream;
  let fountainDecoder: FountainDecoder;

  onMount(async () => {
    if ("BarcodeDetector" in globalThis) {
      reader = {
        using: "api",
        detector: new BarcodeDetector({ formats: ["qr_code"] }),
      };
    } else {
      const canvas = document.createElement("canvas");
      reader = {
        using: "library",
        canvas,
        context: canvas.getContext("2d", { willReadFrequently: true })!,
      };
    }

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
      if (reader?.using == "api") {
        try {
          const [data] = await reader.detector.detect(video);
          if (data) {
            const bytes = textEncoder.encode(data.rawValue);
            scanned = fountainDecoder.decode(data.rawValue, bytes) ?? "skip";
          }
        } catch (e) {
          scanned = "--";
        }
      } else if (reader?.using == "library") {
        reader.canvas.width = video.videoWidth;
        reader.canvas.height = video.videoHeight;
        reader.context.drawImage(video, 0, 0, reader.canvas.width, reader.canvas.height);
        const image = reader.context.getImageData(0, 0, reader.canvas.width, reader.canvas.height);
        const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
        if (code) {
          scanned = fountainDecoder.decode(code.data, code.binaryData) ?? "skip";
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
<span>using: {reader?.using}</span>
<span class="overflow-hidden overflow-ellipsis whitespace-nowrap text-nowrap">scanned: {scanned}</span>
