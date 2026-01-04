<script lang="ts">
  import { closeDialog, type DialogExports } from "$lib/dialog";

  let {
    scouts,
    onadd,
  }: {
    scouts: string[];
    onadd: (scouts: string[]) => void;
  } = $props();

  let scoutInput = $state("");
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      scoutInput = scoutInput.trim();
      if (!scoutInput.length) {
        error = "No input";
        return;
      }

      let scoutInputs = [scoutInput];

      if (scoutInput.includes(",")) {
        scoutInputs = scoutInput
          .split(",")
          .map((scout) => scout.trim())
          .filter((scout) => scout);
      }

      for (const scout of scoutInputs) {
        if (scouts.some((s) => s.toLowerCase() == scout)) {
          error = `${scout} already exists`;
          return;
        }
      }

      onadd(scoutInputs);
      closeDialog();
    },
  };
</script>

<label class="flex flex-col">
  New scouts(s)
  <input bind:value={scoutInput} class="bg-neutral-800 p-2 text-theme" />
  <span class="pt-1 text-xs font-light">Separate multiple scouts with commas</span>
</label>

{#if error}
  <span>{error}</span>
{/if}
