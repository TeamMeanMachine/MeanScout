<script lang="ts">
  import { download, sessionStorageStore, share } from "$lib";
  import { exportComp, type Comp } from "$lib/comp";
  import Button from "$lib/components/Button.svelte";
  import QrCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import { FileJsonIcon, Share2Icon } from "@lucide/svelte";

  let {
    compRecord,
  }: {
    compRecord: IDBRecord<Comp>;
  } = $props();

  const tab = sessionStorageStore<"qrfcode" | "file">("export-data-tab", "qrfcode");

  const cleanedCompName = compRecord.name.replaceAll(" ", "_");

  const json = exportComp($state.snapshot(compRecord));

  function shareCompAsFile() {
    // Web Share API does not allow JSON files.
    // https://docs.google.com/document/d/1tKPkHA5nnJtmh2TgqWmGSREUzXgMUFDL6yMdVZHqUsg
    share(json, `${cleanedCompName}-comp.txt`, "text/plain");
  }

  function saveCompAsFile() {
    download(json, `${cleanedCompName}-comp.json`, "application/json");
  }
</script>

<span>Export comp</span>

<div class="flex flex-wrap gap-2 text-sm">
  <Button onclick={() => ($tab = "qrfcode")} class={$tab == "qrfcode" ? "font-bold" : "font-light"}>QRF code</Button>
  <Button onclick={() => ($tab = "file")} class={$tab == "file" ? "font-bold" : "font-light"}>File</Button>
</div>

{#if $tab == "qrfcode"}
  <QrCodeDisplay data={json} />
{:else}
  {#if "canShare" in navigator}
    <Button onclick={shareCompAsFile}>
      <Share2Icon class="text-theme" />
      <div class="flex flex-col">
        Share
        <span class="text-xs font-light">As JSON</span>
      </div>
    </Button>
  {/if}
  <Button onclick={saveCompAsFile}>
    <FileJsonIcon class="text-theme" />
    <div class="flex flex-col">
      Save
      <span class="text-xs font-light">As JSON</span>
    </div>
  </Button>
{/if}
