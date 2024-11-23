<script lang="ts">
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
  }: {
    surveyRecord: IDBRecord<Survey>;
  } = $props();

  let name = $state(surveyRecord.name);
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      name = name.trim();

      if (!name) {
        error = "Name can't be blank!";
        return;
      }

      surveyRecord.name = name;
      surveyRecord.modified = new Date();
      closeDialog();
    },
  };
</script>

<span>Edit name:</span>

<input bind:value={name} class="bg-neutral-800 p-2 text-theme" />

{#if error}
  <span>{error}</span>
{/if}
