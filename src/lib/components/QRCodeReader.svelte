<script lang="ts">
  import jsQR from "jsqr";

  let {
    onread,
  }: {
    onread: (data: string) => void;
  } = $props();

  let reading = $state(false);
  let canvas: HTMLCanvasElement;
  let canvasContext: CanvasRenderingContext2D;
  let videoElement = document.createElement("video");
  let cameraStream: MediaStream;

  function tickVideo() {
    if (videoElement.readyState == videoElement.HAVE_ENOUGH_DATA) {
      canvas.height = videoElement.videoHeight;
      canvas.width = videoElement.videoWidth;

      canvasContext.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const image = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });

      if (code) {
        onread(code.data);
        stop();
      }
    }

    if (reading) requestAnimationFrame(tickVideo);
  }

  export function start() {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then((stream) => {
      cameraStream = stream;

      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (context) {
        canvasContext = context;
      }

      videoElement.srcObject = cameraStream;
      videoElement.playsInline = true;
      videoElement.play();

      reading = true;

      requestAnimationFrame(tickVideo);
    });
  }

  export function stop() {
    reading = false;

    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }

    videoElement.pause();
    videoElement = document.createElement("video");
  }
</script>

<canvas bind:this={canvas} class="max-w-full basis-0 {reading ? 'block' : 'hidden'}">
  Displays the camera when trying to read a QR code.
</canvas>
