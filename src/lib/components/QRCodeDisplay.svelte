<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { FountainEncoder } from "$lib/fountain";
  import QRCode from "qrcode";
  import {
    ArrowBigRightDashIcon,
    ChevronRightIcon,
    ChevronsRightIcon,
    SquareCheckBigIcon,
    SquareIcon,
  } from "@lucide/svelte";
  import Button from "./Button.svelte";
  import { sessionStorageStore } from "$lib";
  import { compress, supportsCompressionApi } from "$lib/compress";

  let {
    data,
  }: {
    data: string;
  } = $props();

  const bytesPerFrame = 400;

  const rates = {
    slow: 5,
    medium: 10,
    fast: 20,
  };

  const displayRate = sessionStorageStore<"slow" | "medium" | "fast">("display-rate", "medium");
  const framesPerSecond = $derived(rates[$displayRate] || rates.medium);

  const rateKilos = $derived((bytesPerFrame * framesPerSecond) / 1024);
  let blocksCount = $state(0);

  const useCompression = sessionStorageStore<"true" | "">("use-compression", supportsCompressionApi ? "true" : "");
  let fountainEncoder: FountainEncoder;

  let dataToEncode = $state(new TextEncoder().encode(data));

  async function initFountainEncoder() {
    clearInterval(interval);

    dataToEncode = $useCompression ? await compress(data) : new TextEncoder().encode(data);
    fountainEncoder = new FountainEncoder(dataToEncode, bytesPerFrame);
    blocksCount = fountainEncoder.blocks.length;

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

<div class="flex flex-wrap gap-2">
  <Button
    disabled={blocksCount == 1}
    onclick={() => {
      if ($displayRate == "slow") {
        $displayRate = "medium";
      } else if ($displayRate == "fast") {
        $displayRate = "slow";
      } else {
        $displayRate = "fast";
      }
      clearInterval(interval);
      interval = setInterval(update, 1000 / framesPerSecond);
    }}
    class="grow basis-48 flex-col items-start"
  >
    <div class="flex gap-2 capitalize">
      {#if $displayRate == "slow"}
        <ChevronRightIcon class="text-theme" />
        <span class="font-light">{$displayRate}</span>
      {:else if $displayRate == "fast"}
        <ArrowBigRightDashIcon class="text-theme" />
        <span class="font-bold">{$displayRate}</span>
      {:else}
        <ChevronsRightIcon class="text-theme" />
        <span>{$displayRate}</span>
      {/if}
    </div>

    <div class="flex gap-x-4">
      <div class="flex flex-col">
        <span class="text-xs font-light">Rate</span>
        <span class="text-sm">~{Math.round(rateKilos)} KB/s</span>
      </div>
      <div class="flex flex-col">
        <span class="text-xs font-light">Best</span>
        <span class="text-sm">{(dataToEncode.byteLength / 1024 / rateKilos).toFixed(2)} s</span>
      </div>
    </div>
  </Button>

  <Button
    disabled={!supportsCompressionApi}
    onclick={() => {
      $useCompression = $useCompression ? "" : "true";
      initFountainEncoder();
    }}
    class="grow basis-48 flex-col items-start"
  >
    <div class="flex gap-2">
      {#if $useCompression}
        <SquareCheckBigIcon class="text-theme" />
      {:else}
        <SquareIcon class="text-theme" />
      {/if}

      <span class={$useCompression == "true" ? "font-bold" : "font-light"}>Compress</span>
    </div>

    <div class="flex gap-x-4">
      <div class="flex flex-col">
        <span class="text-xs font-light">Chunks</span>
        <span class="text-sm">{blocksCount}</span>
      </div>
      <div class="flex flex-col">
        <span class="text-xs font-light">Total</span>
        <span class="text-sm">{(dataToEncode.byteLength / 1024).toFixed(2)} KB</span>
      </div>
    </div>
  </Button>
</div>
