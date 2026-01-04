<script lang="ts">
  import { ListPlusIcon } from "@lucide/svelte";
  import type { Team } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";

  let {
    team,
    pickListName,
    omitted,
    omittedReason,
    onomit,
    onunomit,
  }: {
    team: Team;
    pickListName: string;
    omitted: boolean;
    omittedReason?: string | undefined;
    onomit(reason?: string | undefined): void;
    onunomit(): void;
  } = $props();

  let omittedReasonChanges = $state($state.snapshot(omittedReason) || "");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      onomit(omittedReasonChanges.trim() || undefined);
      closeDialog();
    },
  };
</script>

{#if omitted}
  <div class="flex flex-wrap items-center justify-between gap-2">
    <span>{team.number} omitted from {pickListName}</span>

    <Button
      onclick={() => {
        onunomit();
        closeDialog();
      }}
      class="text-sm"
    >
      <ListPlusIcon class="size-5 text-theme" />
      Un-omit
    </Button>
  </div>
{:else}
  <span>Omit {team.number} from {pickListName}</span>
{/if}

<label class="flex flex-col">
  Reason
  <input bind:value={omittedReasonChanges} class="bg-neutral-800 p-2 text-theme" />
</label>
