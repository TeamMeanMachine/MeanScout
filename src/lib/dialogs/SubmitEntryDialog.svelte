<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import QRCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import { entryAsCSV, type Entry } from "$lib/entry";
  import { flattenFields, getDefaultFieldValue } from "$lib/field";
  import type { Survey } from "$lib/survey";

  let {
    idb,
    surveyRecord = $bindable(),
    entryRecord: entryRecord,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<Survey>;
    entryRecord: IDBRecord<Entry>;
  } = $props();

  const flattenedFields = flattenFields(surveyRecord.fields);

  let dialog: ReturnType<typeof Dialog>;

  let isExporting = $state(false);
  let entryCSV = $state("");
  let error = $state("");

  function onopen() {
    for (let i = 0; i < entryRecord.values.length; i++) {
      const value = entryRecord.values[i];
      if (value == undefined || typeof value !== typeof getDefaultFieldValue(flattenedFields[i])) {
        error = `Invalid value for ${flattenedFields[i].name}`;
        return;
      }
    }

    entryCSV = entryAsCSV(entryRecord);
  }

  function onconfirm() {
    if (error) {
      return;
    }

    let submittedEntry: Entry = {
      ...$state.snapshot(entryRecord),
      status: isExporting ? "exported" : "submitted",
      modified: new Date(),
    };

    const submitRequest = idb.transaction("entries", "readwrite").objectStore("entries").put(submittedEntry);
    submitRequest.onerror = () => {
      error = `Could not submit entry: ${submitRequest.error?.message}`;
    };

    submitRequest.onsuccess = () => {
      surveyRecord.modified = new Date();
      location.hash = `/survey/${surveyRecord.id}`;
    };
  }

  function onclose() {
    isExporting = false;
    entryCSV = "";
    error = "";
  }
</script>

<Button onclick={() => dialog.open()}>
  <Icon name="floppy-disk" />
  Submit
</Button>

<Dialog bind:this={dialog} {onopen} {onconfirm} {onclose}>
  <span>
    Submit
    {#if isExporting}
      and export
    {/if}
  </span>
  <Button onclick={() => (isExporting = !isExporting)}>
    {#if isExporting}
      <Icon name="xmark" />
      Don't export
    {:else}
      <Icon name="share-from-square" />
      Export
    {/if}
  </Button>
  {#if isExporting && entryCSV}
    <QRCodeDisplay data={entryCSV} />
  {/if}
  {#if error}
    <span>{error}</span>
  {/if}
</Dialog>
