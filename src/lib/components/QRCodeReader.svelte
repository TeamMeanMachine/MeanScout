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

  let reading = $state(false);
  let canvas: HTMLCanvasElement;
  let context: CanvasRenderingContext2D;
  let video: HTMLVideoElement;
  let stream: MediaStream;
  let fountainDecoder: FountainDecoder;
  let scanned = $state<number[] | string>("--");

  onMount(async () => {
    if (reading) stop();

    fountainDecoder = new FountainDecoder();
    fountainDecoder.ondecode = (message) => {
      stop();
      onread(message);
    };

    stream = await navigator.mediaDevices.getUserMedia({
      video: $cameraStore ? { deviceId: { exact: $cameraStore } } : true,
      audio: false,
    });

    canvas = document.createElement("canvas");
    context = canvas.getContext("2d", { willReadFrequently: true })!;

    video.srcObject = stream;

    reading = true;

    if ("requestVideoFrameCallback" in video) {
      video.requestVideoFrameCallback(update);
    } else {
      requestAnimationFrame(update);
    }
  });

  onDestroy(() => stop());

  function update() {
    if (!reading) return;
    scanned = "--";

    if (video.readyState == video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });

      if (code) {
        scanned = fountainDecoder.decode(code) ?? "skip";
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

<video bind:this={video} autoplay muted class={reading ? "block" : "hidden"}></video>
<span class="overflow-hidden overflow-ellipsis whitespace-nowrap text-nowrap">scanned: {scanned}</span>
