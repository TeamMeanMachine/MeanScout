<script lang="ts">
  import type { Comp } from "$lib/comp";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { teamStore } from "$lib/settings";
  import { tbaEventExists, tbaGetTeamEvents } from "$lib/tba";
  import { LoaderIcon } from "@lucide/svelte";
  import { onMount } from "svelte";

  let {
    compRecord,
    onedit,
  }: {
    compRecord: IDBRecord<Comp>;
    onedit: (tbaEventKey: string) => void;
  } = $props();

  let event = $state(compRecord.tbaEventKey ?? "");
  let error = $state("");
  let events = $state<{ name: string; key: string }[]>([]);

  let isLoadingEvents = $state(!!$teamStore);

  onMount(() => {
    if (!$teamStore) return;
    tbaGetTeamEvents($teamStore)
      .then((response) => {
        if (response.events) {
          events = response.events;
        } else if (response.error) {
          error = response.error;
        }
      })
      .finally(() => (isLoadingEvents = false));
  });

  export const { onconfirm }: DialogExports = {
    async onconfirm() {
      event = event.trim();

      if (!event) {
        onedit(event);
        closeDialog();
        return;
      }

      const eventNotFound = events.every((e) => e.key != event);

      if (eventNotFound || !(await tbaEventExists(event))) {
        error = "could not find event";
        return;
      }

      onedit(event);
      closeDialog();
    },
  };
</script>

<div class="flex flex-wrap justify-between gap-2">
  <span>Edit TBA event:</span>
  {#if isLoadingEvents}
    <LoaderIcon class="text-theme animate-spin" />
  {/if}
</div>

<datalist id="events-list">
  {#each events as { name, key }}
    <option value={key}>{name}</option>
  {/each}
</datalist>
<input bind:value={event} list="events-list" class="text-theme bg-neutral-800 p-2" />

{#if error}
  <span>Error: {error}</span>
{/if}
