<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { FountainDecoder } from "$lib/fountain";
  import { cameraStore } from "$lib/settings";
  import jsQR from "jsqr";
  import { decompress } from "$lib/compress";

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

  let video: HTMLVideoElement | undefined = undefined;
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
<span class="overflow-hidden text-nowrap text-ellipsis whitespace-nowrap">scanned: {scanned}</span>
