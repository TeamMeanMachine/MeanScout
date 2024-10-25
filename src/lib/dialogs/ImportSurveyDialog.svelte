<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { tbaAuthKeyStore } from "$lib/settings";
  import { surveySchema } from "$lib/survey";
  import { tbaEventExists } from "$lib/tba";

  let {
    idb,
  }: {
    idb: IDBDatabase;
  } = $props();

  let dialog: ReturnType<typeof Dialog>;

  let files = $state<FileList | undefined>(undefined);
  let error = $state("");

  async function onconfirm() {
    if (!files?.length) {
      error = "No input";
      return;
    }

    let survey: any;

    try {
      const surveyText = await files[0].text();
      survey = JSON.parse(surveyText.trim());
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

    if (
      result.data.tbaEventKey?.length &&
      $tbaAuthKeyStore &&
      !(await tbaEventExists(result.data.tbaEventKey, $tbaAuthKeyStore))
    ) {
      error = "TBA event key is invalid";
      return;
    }

    const addRequest = idb.transaction("surveys", "readwrite").objectStore("surveys").add(result.data);
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
  }

  function onclose() {
    error = "";
  }
</script>

<Button onclick={() => dialog.open()}>
  <Icon name="paste" />
  <div class="flex flex-col">
    Import survey
    <small>From a file</small>
  </div>
</Button>

<Dialog bind:this={dialog} {onconfirm} {onclose}>
  <span>Import survey</span>
  <input
    type="file"
    accept=".json,.txt"
    bind:files
    class="file:mr-3 file:border-none file:bg-neutral-800 file:p-2 file:text-theme"
  />
  {#if error}
    <span>{error}</span>
  {/if}
</Dialog>
