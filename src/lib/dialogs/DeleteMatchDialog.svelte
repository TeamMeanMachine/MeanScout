<script lang="ts">
  import type { Match } from "$lib";
  import { closeDialog, type DialogExports } from "$lib/dialog";

  let {
    match,
    ondelete,
  }: {
    match: Match;
    ondelete: () => void;
  } = $props();

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      ondelete();
      closeDialog();
    },
  };
</script>

<span>
  Delete match
  {#if match.level && match.level != "qm"}
    {match.level}{match.set || 1}-{match.number}?
  {:else}
    {match.number}?
  {/if}
</span>
