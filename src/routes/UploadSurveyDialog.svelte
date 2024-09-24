<script lang="ts">
  import Dialog from "$lib/components/Dialog.svelte";
  import { tbaAuthKeyStore } from "$lib/settings";
  import { surveySchema, type Survey } from "$lib/survey";
  import { tbaEventExists } from "$lib/tba";

  let {
    idb,
  }: {
    idb: IDBDatabase;
  } = $props();

  let dialog: Dialog;

  let survey = $state<Survey | undefined>();
  let error = $state("");

  export async function open(data: string) {
    try {
      var json = JSON.parse(data);
    } catch (e: any) {
      error = "Could not upload survey: Invalid input";
      dialog.open();
      return;
    }

    const result = surveySchema.safeParse(json);

    if (!result.success) {
      error = result.error.message;
      dialog.open();
      return;
    }

    if (
      result.data.tbaEventKey?.length &&
      $tbaAuthKeyStore &&
      !(await tbaEventExists(result.data.tbaEventKey, $tbaAuthKeyStore))
    ) {
      error = "Could not upload survey: TBA event key is invalid";
      dialog.open();
      return;
    }

    survey = result.data;
    dialog.open();
  }

  async function onconfirm() {
    if (!survey) return;

    const addRequest = idb.transaction("surveys", "readwrite").objectStore("surveys").add(survey);
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
  }

  function onclose() {
    survey = undefined;
    error = "";
  }
</script>

<Dialog bind:this={dialog} onconfirm={survey ? onconfirm : undefined} {onclose}>
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
</Dialog>
