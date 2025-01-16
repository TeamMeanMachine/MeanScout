<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { FountainEncoder } from "$lib/fountain";
  import QRCode from "qrcode";

  let {
    data,
    framesPerSecond = 15,
    bytesPerFrame = 400,
  }: {
    data: Uint8Array;
    framesPerSecond?: number;
    bytesPerFrame?: number;
  } = $props();

  const fountainEncoder = new FountainEncoder(data, bytesPerFrame);

  let canvas: HTMLCanvasElement;
  let interval: NodeJS.Timeout | undefined = undefined;
  let drawing = true;

  onMount(() => {
    update();

    if (fountainEncoder.blocks.length > 1) {
      interval = setInterval(update, 1000 / framesPerSecond);
    }
  });

  onDestroy(() => {
    drawing = false;
    clearInterval(interval);
  });

  function update() {
    if (!drawing) return;

    QRCode.toCanvas(canvas, [{ data: fountainEncoder.encode() }], {
      width: 516,
      margin: 4,
      errorCorrectionLevel: "L",
    });
  }
</script>

<canvas bind:this={canvas} class="aspect-square max-w-full basis-0" style="image-rendering:pixelated;">
  Displays a QR code to scan.
</canvas>
