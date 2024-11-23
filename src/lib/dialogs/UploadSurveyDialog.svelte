<script lang="ts">
  import type { DialogExports } from "$lib/dialog";
  import { objectStore } from "$lib/idb";
  import { tbaAuthKeyStore } from "$lib/settings";
  import { jsonToSurvey, surveySchema, type Survey } from "$lib/survey";
  import { tbaEventExists } from "$lib/tba";

  let {
    data,
  }: {
    data: string;
  } = $props();

  let survey = $state<Survey | undefined>();
  let error = $state("");

  export const { onopen, onconfirm }: DialogExports = {
    async onopen(open) {
      const jsonResult = jsonToSurvey(data);
      if (!jsonResult.success) {
        error = jsonResult.error;
        return open();
      }

      const schemaResult = surveySchema.safeParse(jsonResult.survey);
      if (!schemaResult.success) {
        error = schemaResult.error.toString();
        return open();
      }

      if (
        schemaResult.data.tbaEventKey?.length &&
        $tbaAuthKeyStore &&
        !(await tbaEventExists(schemaResult.data.tbaEventKey, $tbaAuthKeyStore))
      ) {
        error = "Could not upload survey: TBA event key is invalid";
        return open();
      }

      survey = schemaResult.data;
      open();
    },
    async onconfirm() {
      if (!survey) return;

      const addRequest = objectStore("surveys", "readwrite").add($state.snapshot(survey));
      addRequest.onerror = () => {
        error = `Could not upload survey: ${addRequest.error?.message}`;
      };

      addRequest.onsuccess = () => {
        const id = addRequest.result;
        if (id == undefined) {
          error = "Could not upload survey";
          return;
        }

        location.hash = `/survey/${id}`;
      };
    },
  };
</script>

{#if survey}
  <span>Upload survey?</span>

  <span><small>Name</small> <strong>{survey.name}</strong></span>
  <span><small>Type</small> <strong>{survey.type}</strong></span>
  {#if survey.tbaEventKey}
    <span><small>TBA Event Key</small> <strong>{survey.tbaEventKey}</strong></span>
  {/if}
{/if}

{#if error}
  <span>{error}</span>
{/if}
