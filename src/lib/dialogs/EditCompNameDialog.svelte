<script lang="ts">
  import type { Comp } from "$lib/comp";
  import { closeDialog, type DialogExports } from "$lib/dialog";

  let {
    compRecord,
    onedit,
  }: {
    compRecord: Comp;
    onedit: (name: string) => void;
  } = $props();

  let name = $state(compRecord.name);
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

<input bind:value={name} class="bg-neutral-800 p-2 text-theme" />

{#if error}
  <span>{error}</span>
{/if}
