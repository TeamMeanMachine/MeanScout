<script lang="ts">
  import { download, share } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import QrCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import { surveyToJSON, type Survey } from "$lib/survey";

  let {
    surveyRecord,
    type,
  }: {
    surveyRecord: IDBRecord<Survey>;
    type: "qrcode" | "file";
  } = $props();

  const cleanedSurveyName = surveyRecord.name.replaceAll(" ", "_");

  function surveyAsJSON() {
    return surveyToJSON($state.snapshot(surveyRecord));
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

{#if type == "qrcode"}
  <QrCodeDisplay data={surveyAsJSON()} />
{:else if type == "file"}
  {#if "canShare" in navigator}
    <Button onclick={shareSurveyAsFile}>
      <Icon name="share-from-square" />
      Share
    </Button>
  {/if}
  <Button onclick={saveSurveyAsFile}>
    <Icon name="file-code" />
    Save
  </Button>
{/if}
