<script lang="ts">
  import type { Match } from "$lib";
  import { type DialogExports } from "$lib/dialog";

  let {
    match,
    ondelete,
  }: {
    match: Match;
    ondelete(): void;
  } = $props();

  export const { onconfirm }: DialogExports = {
    onconfirm: ondelete,
  };
</script>

<div class="flex flex-col">
  <span>
    Delete match
    {#if match.level && match.level != "qm"}
      {match.level}{match.set || 1}-{match.number}?
    {:else}
      {match.number}?
    {/if}
  </span>
  <span class="text-sm font-light">Scouting data won't be affected.</span>
</div>
