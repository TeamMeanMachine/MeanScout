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
    const dataToEncode = $useCompression ? await compress(data) : new TextEncoder().encode(data);
    fountainEncoder = new FountainEncoder(dataToEncode, bytesPerFrame);
  }

  let canvas: HTMLCanvasElement;
  let interval: NodeJS.Timeout | undefined = undefined;
  let drawing = true;

  onMount(async () => {
    await initFountainEncoder();

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

<Button
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
  <div class="flex flex-col">
    <span class={$useCompression == "true" ? "font-bold" : "font-light"}>Compress data</span>
    <small>Uncheck for Apple devices</small>
  </div>
</Button>
