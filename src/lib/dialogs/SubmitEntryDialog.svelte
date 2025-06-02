<script lang="ts">
  import { sessionStorageStore } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import QrCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { exportEntries, type Entry } from "$lib/entry";
  import { getDefaultFieldValue, type SingleFieldWithDetails } from "$lib/field";
  import { objectStore } from "$lib/idb";
  import { SquareCheckBigIcon, ChevronUpIcon, SquareIcon, ChevronDownIcon } from "@lucide/svelte";

  let {
    orderedSingleFields,
    entryRecord,
    onexport,
  }: {
    orderedSingleFields: SingleFieldWithDetails[];
    entryRecord: IDBRecord<Entry>;
    onexport: () => void;
  } = $props();

  const entryExport = sessionStorageStore<"true" | "">("entry-export", "");

  const defaultValues = orderedSingleFields.map((field) => getDefaultFieldValue(field.field));

  const entryJson = exportEntries([
    entryRecord.type == "match" && entryRecord.absent ? { ...entryRecord, values: defaultValues } : entryRecord,
  ]);

  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      if (error) {
        return;
      }

      let submittedEntry: Entry = {
        ...$state.snapshot(entryRecord),
        status: $entryExport ? "exported" : "submitted",
        modified: new Date(),
      };

      if (submittedEntry.type == "match" && submittedEntry.absent) {
        submittedEntry.values = defaultValues;
      }

      const submitRequest = objectStore("entries", "readwrite").put(submittedEntry);
      submitRequest.onerror = () => {
        error = `Could not submit entry: ${submitRequest.error?.message}`;
      };

      submitRequest.onsuccess = () => {
        onexport();
        closeDialog();
      };
    },
  };
</script>

<span>
  {#if $entryExport}
    Submit this entry <span class="font-bold">as exported?</span>
  {:else}
    Submit this entry?
  {/if}
</span>

<Button onclick={() => ($entryExport = $entryExport ? "" : "true")}>
  {#if $entryExport}
    <SquareCheckBigIcon class="text-theme" />
    <div class="flex grow flex-col">
      <span class="font-bold">Export</span>
      <span class="text-xs font-light">QRF code</span>
    </div>
    <ChevronUpIcon class="text-theme" />
  {:else}
    <SquareIcon class="text-theme" />
    <div class="flex grow flex-col">
      Export
      <span class="text-xs font-light">QRF code</span>
    </div>
    <ChevronDownIcon class="text-theme" />
  {/if}
</Button>

{#if $entryExport}
  <QrCodeDisplay data={entryJson} />
{/if}

{#if error}
  <span>{error}</span>
{/if}
