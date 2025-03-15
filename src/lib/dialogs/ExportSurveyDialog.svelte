<script lang="ts">
  import { download, sessionStorageStore, share } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import QrCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import type { Field } from "$lib/field";
  import { exportSurvey, type Survey } from "$lib/survey";
  import { FileJsonIcon, Share2Icon } from "@lucide/svelte";

  let {
    surveyRecord,
    fieldRecords,
  }: {
    surveyRecord: IDBRecord<Survey>;
    fieldRecords: IDBRecord<Field>[];
  } = $props();

  const tab = sessionStorageStore<"qrfcode" | "file">("export-data-tab", "qrfcode");

  const cleanedSurveyName = surveyRecord.name.replaceAll(" ", "_");

  const json = exportSurvey($state.snapshot(surveyRecord), $state.snapshot(fieldRecords));

  function shareSurveyAsFile() {
    // Web Share API does not allow JSON files.
    // https://docs.google.com/document/d/1tKPkHA5nnJtmh2TgqWmGSREUzXgMUFDL6yMdVZHqUsg
    share(json, `${cleanedSurveyName}-survey.txt`, "text/plain");
  }

  function saveSurveyAsFile() {
    download(json, `${cleanedSurveyName}-survey.json`, "application/json");
  }
</script>

<span>Export survey</span>

<div class="flex flex-wrap gap-2 text-sm">
  <Button onclick={() => ($tab = "qrfcode")} class={$tab == "qrfcode" ? "font-bold" : "font-light"}>QRF code</Button>
  <Button onclick={() => ($tab = "file")} class={$tab == "file" ? "font-bold" : "font-light"}>File</Button>
</div>

{#if $tab == "qrfcode"}
  <QrCodeDisplay data={json} />
{:else}
  {#if "canShare" in navigator}
    <Button onclick={shareSurveyAsFile}>
      <Share2Icon class="text-theme" />
      <div class="flex flex-col">
        Share
        <small>As JSON</small>
      </div>
    </Button>
  {/if}
  <Button onclick={saveSurveyAsFile}>
    <FileJsonIcon class="text-theme" />
    <div class="flex flex-col">
      Save
      <small>As JSON</small>
    </div>
  </Button>
{/if}
