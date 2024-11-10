<script lang="ts">
  import type { DialogExports } from "$lib/dialog";
  import { objectStore } from "$lib/idb";
  import { tbaAuthKeyStore } from "$lib/settings";
  import { jsonToSurvey, surveySchema, type Survey } from "$lib/survey";
  import { tbaEventExists } from "$lib/tba";

  let files = $state<FileList | undefined>();
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

      const addRequest = objectStore("surveys", "readwrite").add($state.snapshot(importedSurvey));
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

  async function onchange() {
    if (!files?.length) {
      return;
    }

    const jsonResult = jsonToSurvey(await files[0].text());
    if (!jsonResult.success) {
      error = jsonResult.error;
      return;
    }

    const schemaResult = surveySchema.safeParse(jsonResult.survey);
    if (!schemaResult.success) {
      error = schemaResult.error.toString();
      return;
    }

    importedSurvey = schemaResult.data;
  }
</script>

<span>Import survey</span>

<input
  type="file"
  accept=".json,.txt"
  bind:files
  {onchange}
  class="file:mr-3 file:border-none file:bg-neutral-800 file:p-2 file:text-theme"
/>

{#if importedSurvey}
  <span><small>Name</small> <strong>{importedSurvey.name}</strong></span>
  <span><small>Type</small> <strong>{importedSurvey.type}</strong></span>
  {#if importedSurvey.tbaEventKey}
    <span><small>TBA Event Key</small> <strong>{importedSurvey.tbaEventKey}</strong></span>
  {/if}
{/if}

{#if error}
  <span>{error}</span>
{/if}
