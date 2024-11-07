<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import QRCodeReader from "$lib/components/QRCodeReader.svelte";
  import type { DialogExports } from "$lib/dialog";
  import { objectStore } from "$lib/idb";
  import { tbaAuthKeyStore } from "$lib/settings";
  import { surveySchema, type Survey } from "$lib/survey";
  import { tbaEventExists } from "$lib/tba";

  let importedSurvey = $state<Survey | undefined>();
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    async onconfirm() {
      if (!importedSurvey) {
        error = "No input";
        return;
      }

      if (
        importedSurvey.tbaEventKey?.length &&
        $tbaAuthKeyStore &&
        !(await tbaEventExists(importedSurvey.tbaEventKey, $tbaAuthKeyStore))
      ) {
        error = "TBA event key is invalid";
        return;
      }

      const addRequest = objectStore("surveys", "readwrite").add(importedSurvey);
      addRequest.onerror = () => {
        error = `Could not add survey: ${addRequest.error?.message}`;
      };

      addRequest.onsuccess = () => {
        const id = addRequest.result;
        if (id == undefined) {
          error = "Could not add survey";
          return;
        }

        location.hash = `/survey/${id}`;
      };
    },
  };

  function onread(data: string) {
    let survey: any;

    try {
      survey = JSON.parse(data.trim());
    } catch (e) {
      error = "Invalid input";
      return;
    }

    delete survey.id;
    delete survey.entries;

    const result = surveySchema.safeParse(survey);
    if (!result.success) {
      error = result.error.toString();
      return;
    }

    importedSurvey = result.data;
  }

  function retry() {
    error = "";
    importedSurvey = undefined;
  }
</script>

<span>Import survey</span>

{#if importedSurvey}
  <span><small>Name</small> <strong>{importedSurvey.name}</strong></span>
  <span><small>Type</small> <strong>{importedSurvey.type}</strong></span>
  {#if importedSurvey.tbaEventKey}
    <span><small>TBA Event Key</small> <strong>{importedSurvey.tbaEventKey}</strong></span>
  {/if}
  <Button onclick={retry}>
    <Icon name="arrow-rotate-left" />
    Retry
  </Button>
{:else}
  <QRCodeReader {onread} />
{/if}

{#if error}
  <span>{error}</span>
{/if}
