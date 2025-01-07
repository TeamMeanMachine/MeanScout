<script lang="ts">
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { tbaAuthKeyStore, teamStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";
  import { tbaEventExists, tbaGetTeamEvents } from "$lib/tba";

  let {
    surveyRecord,
    onedit,
  }: {
    surveyRecord: IDBRecord<Survey>;
    onedit: (tbaEventKey: string) => void;
  } = $props();

  let event = $state(surveyRecord.tbaEventKey ?? "");
  let error = $state("");
  let events = $state<{ name: string; key: string }[]>([]);

  export const { onopen, onconfirm }: DialogExports = {
    async onopen(open) {
      if (!$teamStore || !$tbaAuthKeyStore) {
        return open();
      }

      const response = await tbaGetTeamEvents($teamStore, $tbaAuthKeyStore);

      if (response.events) {
        events = response.events;
      } else if (response.error) {
        error = response.error;
      }

      open();
    },
    async onconfirm() {
      event = event.trim();

      if (!event) {
        onedit(event);
        return closeDialog();
      }

      const eventNotFound = !events.map((e) => e.key).includes(event);

      if (eventNotFound || !(await tbaEventExists(event, $tbaAuthKeyStore))) {
        error = "could not find event";
        return;
      }

      onedit(event);
      closeDialog();
    },
  };
</script>

<span>Edit TBA event:</span>

<datalist id="events-list">
  {#each events as { name, key }}
    <option value={key}>{name}</option>
  {/each}
</datalist>
<input bind:value={event} list="events-list" class="bg-neutral-800 p-2 text-theme" />

{#if error}
  <span>Error: {error}</span>
{/if}
