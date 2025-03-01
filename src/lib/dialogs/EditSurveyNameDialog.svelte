<script lang="ts">
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    onedit,
  }: {
    surveyRecord: IDBRecord<Survey>;
    onedit: (name: string) => void;
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

      onedit(name);
      closeDialog();
    },
  };
</script>

<span>Edit name:</span>

<input bind:value={name} class="text-theme bg-neutral-800 p-2" />

{#if error}
  <span>{error}</span>
{/if}
