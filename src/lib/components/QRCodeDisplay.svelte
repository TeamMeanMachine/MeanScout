<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { FountainEncoder } from "$lib/fountain";
  import QRCode from "qrcode";
  import { SquareCheckBigIcon, SquareIcon } from "@lucide/svelte";
  import Button from "./Button.svelte";
  import { sessionStorageStore } from "$lib";
  import { compress, supportsCompressionApi } from "$lib/compress";

  let {
    data,
    framesPerSecond = 10,
    bytesPerFrame = 400,
  }: {
    data: string;
    framesPerSecond?: number;
    bytesPerFrame?: number;
  } = $props();

  const useCompression = sessionStorageStore<"true" | "">("use-compression", supportsCompressionApi ? "true" : "");
  let fountainEncoder: FountainEncoder;

  async function initFountainEncoder() {
    clearInterval(interval);

    const dataToEncode = $useCompression ? await compress(data) : new TextEncoder().encode(data);
    fountainEncoder = new FountainEncoder(dataToEncode, bytesPerFrame);

    update();

    if (fountainEncoder.blocks.length > 1) {
      interval = setInterval(update, 1000 / framesPerSecond);
    }
  }

  let canvas: HTMLCanvasElement;
  let interval: NodeJS.Timeout | undefined = undefined;
  let drawing = true;

  onMount(() => {
    initFountainEncoder();
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

<Button
  disabled={!supportsCompressionApi}
  onclick={() => {
    $useCompression = $useCompression ? "" : "true";
    initFountainEncoder();
  }}
>
  {#if $useCompression}
    <SquareCheckBigIcon class="text-theme" />
  {:else}
    <SquareIcon class="text-theme" />
  {/if}
  <span class={$useCompression == "true" ? "font-bold" : "font-light"}>Compress</span>
</Button>
