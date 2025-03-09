<script lang="ts">
  import { download, sessionStorageStore, share } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import QrCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import type { Field } from "$lib/field";
  import { exportSurvey, exportSurveyCompressed, type Survey } from "$lib/survey";

  let {
    surveyRecord,
    fieldRecords,
  }: {
    surveyRecord: IDBRecord<Survey>;
    fieldRecords: IDBRecord<Field>[];
  } = $props();

  const tab = sessionStorageStore<"qrfcode" | "file">("export-data-tab", CompressionStream ? "qrfcode" : "file");

  const cleanedSurveyName = surveyRecord.name.replaceAll(" ", "_");

  function surveyAsJSON() {
    return exportSurvey($state.snapshot(surveyRecord), $state.snapshot(fieldRecords));
  }

  function shareSurveyAsFile() {
    // Web Share API does not allow JSON files.
    // https://docs.google.com/document/d/1tKPkHA5nnJtmh2TgqWmGSREUzXgMUFDL6yMdVZHqUsg
    share(surveyAsJSON(), `${cleanedSurveyName}-survey.txt`, "text/plain");
  }

  function saveSurveyAsFile() {
    download(surveyAsJSON(), `${cleanedSurveyName}-survey.json`, "application/json");
  }
</script>

<span>Export survey</span>

{#if CompressionStream}
  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => ($tab = "qrfcode")} class={$tab == "qrfcode" ? "font-bold" : "font-light"}>QRF code</Button>
    <Button onclick={() => ($tab = "file")} class={$tab == "file" ? "font-bold" : "font-light"}>File</Button>
  </div>
{/if}

{#if $tab == "qrfcode" && CompressionStream}
  {#await exportSurveyCompressed($state.snapshot(surveyRecord), $state.snapshot(fieldRecords)) then data}
    <QrCodeDisplay {data} />
  {/await}
{:else}
  {#if "canShare" in navigator}
    <Button onclick={shareSurveyAsFile}>
      <Icon name="share-from-square" />
      <div class="flex flex-col">
        Share
        <small>As JSON</small>
      </div>
    </Button>
  {/if}
  <Button onclick={saveSurveyAsFile}>
    <Icon name="file-code" />
    <div class="flex flex-col">
      Save
      <small>As JSON</small>
    </div>
  </Button>
{/if}
