<script lang="ts">
  import { type DialogExports, closeDialog } from "$lib/dialog";

  let {
    scouts,
    onadd,
  }: {
    scouts: string[];
    onadd: (scout: string) => void;
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

      if (scouts.some((s) => s == scoutInput)) {
        error = `${scoutInput} already exists`;
        return;
      }

      onadd(scoutInput);
      closeDialog();
    },
  };
</script>

<label class="flex flex-col">
  New scout
  <input bind:value={scoutInput} class="text-theme bg-neutral-800 p-2" />
</label>

{#if error}
  <span>{error}</span>
{/if}
