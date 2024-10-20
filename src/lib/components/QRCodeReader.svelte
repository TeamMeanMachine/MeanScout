<script lang="ts">
  import jsQR from "jsqr";
  import { cameraStore } from "$lib/settings";

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

  export async function start() {
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
  }

  function update() {
    if (video.readyState == video.HAVE_ENOUGH_DATA) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });

      if (code) {
        onread(code.data);
        stop();
      }
    }

    if (reading) {
      if ("requestVideoFrameCallback" in video) {
        video.requestVideoFrameCallback(update);
      } else {
        requestAnimationFrame(update);
      }
    }
  }
  export function stop() {
    reading = false;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  }
</script>

<video bind:this={video} autoplay muted class={reading ? "block" : "hidden"}></video>
