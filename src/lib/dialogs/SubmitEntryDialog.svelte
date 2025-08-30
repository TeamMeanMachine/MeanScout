<script lang="ts">
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { type Entry } from "$lib/entry";
  import { getDefaultFieldValue, type SingleFieldWithDetails } from "$lib/field";
  import { idb } from "$lib/idb";

  let {
    orderedSingleFields,
    entryRecord,
    onsubmit,
  }: {
    orderedSingleFields: SingleFieldWithDetails[];
    entryRecord: Entry;
    onsubmit: () => void;
  } = $props();

  const defaultValues = orderedSingleFields.map((field) => getDefaultFieldValue(field.field));

  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      if (error) {
        return;
      }

      let submittedEntry: Entry = {
        ...$state.snapshot(entryRecord),
        status: "submitted",
        modified: new Date(),
      };

      if (submittedEntry.type == "match" && submittedEntry.absent) {
        submittedEntry.values = defaultValues;
      }

      const submitRequest = idb.put("entries", submittedEntry);
      submitRequest.onerror = () => {
        error = `Could not submit entry: ${submitRequest.error?.message}`;
      };

      submitRequest.onsuccess = () => {
        onsubmit();
        closeDialog();
      };
    },
  };
</script>

<span>Submit this entry?</span>

{#if error}
  <span>{error}</span>
{/if}
