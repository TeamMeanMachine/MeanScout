<script lang="ts">
  import type { Team } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";

  let {
    team,
    onedit,
    ondelete,
  }: {
    team: Team;
    onedit(number: string): void;
    ondelete(): void;
  } = $props();

  let name = $state(structuredClone($state.snapshot(team.name)));

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      onedit(name.trim());
      closeDialog();
    },
  };
</script>

<span>Edit Team {team.number}</span>

<label class="flex flex-col">
  Name
  <input bind:value={name} class="text-theme bg-neutral-800 p-2" />
</label>

<Button
  onclick={() => {
    ondelete();
    closeDialog();
  }}
>
  <Icon name="trash" />
  Delete
</Button>
