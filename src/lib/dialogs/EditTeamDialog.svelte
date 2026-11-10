<script lang="ts">
  import { Trash2Icon } from "@lucide/svelte";
  import type { Team } from "#lib";
  import Button from "#lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "#lib/dialog.ts";

  let {
    team,
    onedit,
    ondelete,
  }: {
    team: Team;
    onedit(name: string, remap?: string | undefined): void;
    ondelete(): void;
  } = $props();

  // svelte-ignore state_referenced_locally
  let name = $state(team.name);

  // svelte-ignore state_referenced_locally
  let remap = $state(team.remap);

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      onedit(name.trim(), remap?.trim() || undefined);
      closeDialog();
    },
  };
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  <span>Edit Team {team.number}</span>
  <Button
    onclick={() => {
      ondelete();
      closeDialog();
    }}
  >
    <Trash2Icon class="size-5 text-theme" />
  </Button>
</div>

<label class="flex flex-col">
  Name
  <input bind:value={name} class="bg-neutral-800 p-2 text-theme" />
</label>

<label class="flex flex-col">
  Remap to B team
  <input bind:value={remap} class="bg-neutral-800 p-2 text-theme" />
  <span class="pt-1 text-xs font-light">Only applicable for events that use B team numbers</span>
</label>
