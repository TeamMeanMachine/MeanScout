<script lang="ts">
  import QRCode from "qrcode";
  import { onMount } from "svelte";

  let {
    data,
  }: {
    data: string;
  } = $props();

  let canvas: HTMLCanvasElement;

  onMount(() => {
    QRCode.toCanvas(canvas, data, { width: 1000, margin: 2 });
  });
</script>

<canvas bind:this={canvas} class="aspect-square max-w-full basis-0">Displays a QR code to scan.</canvas>
