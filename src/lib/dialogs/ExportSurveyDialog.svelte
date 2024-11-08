<script lang="ts">
  import { download, shareAsFile, shareAsText } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import QrCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
  }: {
    surveyRecord: IDBRecord<Survey>;
  } = $props();

  const cleanedSurveyName = surveyRecord.name.replaceAll(" ", "_");

  let qrCodeData = $state<string | undefined>();

  function surveyAsJSON() {
    const survey = structuredClone($state.snapshot(surveyRecord)) as Survey & { id?: number };
    delete survey.id;
    return JSON.stringify(survey);
  }

  function downloadSurvey() {
    download(surveyAsJSON(), `${cleanedSurveyName}-survey.json`, "application/json");
  }

  function shareSurveyAsFile() {
    // Web Share API does not allow JSON files.
    // https://docs.google.com/document/d/1tKPkHA5nnJtmh2TgqWmGSREUzXgMUFDL6yMdVZHqUsg
    shareAsFile(surveyAsJSON(), `${cleanedSurveyName}-survey.txt`, "text/plain");
  }

  function shareSurveyAsText() {
    shareAsText(surveyAsJSON(), `${cleanedSurveyName}-survey`);
  }

  function shareSurveyAsQRCode() {
    qrCodeData = surveyAsJSON();
  }
</script>

<span>Export survey</span>

{#if qrCodeData}
  <QrCodeDisplay data={qrCodeData} />
{:else}
  <Button onclick={shareSurveyAsQRCode}>
    <Icon name="qrcode" />
    QR code
  </Button>
{/if}

{#if "canShare" in navigator}
  <Button onclick={shareSurveyAsFile}>
    <Icon name="share-from-square" />
    Share file
  </Button>
  <Button onclick={shareSurveyAsText}>
    <Icon name="share" />
    Share text snippet
  </Button>
{/if}
<Button onclick={downloadSurvey}>
  <Icon name="file-code" />
  Download file
</Button>
