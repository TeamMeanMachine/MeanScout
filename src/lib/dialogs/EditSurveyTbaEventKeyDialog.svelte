<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { tbaAuthKeyStore, teamStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";
  import { tbaEventExists, tbaGetTeamEvents } from "$lib/tba";

  let {
    surveyRecord = $bindable(),
  }: {
    surveyRecord: IDBRecord<Survey>;
  } = $props();

  let dialog: ReturnType<typeof Dialog>;

  let event = $state(surveyRecord.tbaEventKey ?? "");
  let error = $state("");
  let events = $state<{ name: string; key: string }[]>([]);

  async function onopen() {
    if (events.length) {
      return;
    }

    if (!$tbaAuthKeyStore || !$teamStore) {
      return;
    }

    const response = await tbaGetTeamEvents($teamStore, $tbaAuthKeyStore);

    if (response.events) {
      events = response.events;
    } else if (response.error) {
      error = response.error;
    }
  }

  async function onconfirm() {
    event = event.trim();

    if (!event) {
      surveyRecord.tbaEventKey = event;
      surveyRecord.modified = new Date();
      dialog.close();
      return;
    }

    const eventAlreadyFound = events.map((e) => e.key).includes(event);

    if (eventAlreadyFound || (await tbaEventExists(event, $tbaAuthKeyStore))) {
      surveyRecord.tbaEventKey = event;
      surveyRecord.modified = new Date();
      dialog.close();
    } else {
      error = "could not find event";
    }
  }

  function onclose() {
    event = surveyRecord.tbaEventKey ?? "";
    error = "";
  }
</script>

<Button onclick={() => dialog.open()}>
  <Icon name="calendar-days" />
  {#if surveyRecord.tbaEventKey}
    <div class="flex flex-col">
      {surveyRecord.tbaEventKey}
      <small>Edit event</small>
    </div>
  {:else}
    Add event
  {/if}
</Button>

<Dialog bind:this={dialog} {onopen} {onconfirm} {onclose}>
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
</Dialog>
