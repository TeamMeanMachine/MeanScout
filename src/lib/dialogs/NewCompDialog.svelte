<script lang="ts">
  import { CalendarDaysIcon, LoaderIcon } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { type Match, type Team } from "$lib";
  import type { Alliance, Comp } from "$lib/comp";
  import Button from "$lib/components/Button.svelte";
  import { openDialog, type DialogExports } from "$lib/dialog";
  import { idb } from "$lib/idb";
  import { tbaGetEventAlliances, tbaGetEventMatches, tbaGetEventTeams } from "$lib/tba";
  import EditCompTbaEventKeyDialog from "./EditCompTbaEventKeyDialog.svelte";

  let name = $state("");
  let event = $state<string | undefined>();
  let id = $state("");
  let matches = $state<Match[]>([]);
  let teams = $state<Team[]>([]);
  let alliances = $state<Alliance[] | undefined>(undefined);

  let error = $state("");

  let isLoadingTbaData = $state(false);

  $effect(() => {
    id = event || idb.generateId({ randomChars: 0 });
  });

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      name = name.trim();
      if (!name) {
        error = "Name can't be blank!";
        return;
      }

      const comp: Comp = {
        id,
        name,
        matches,
        teams,
        created: new Date(),
        modified: new Date(),
      };

      if (event) comp.tbaEventKey = event;
      if (alliances) comp.alliances = alliances;

      const addRequest = idb.add("comps", $state.snapshot(comp));
      addRequest.onerror = () => {
        error = `Could not add comp: ${addRequest.error?.message}`;
      };

      addRequest.onsuccess = () => {
        goto(`#/comp/${comp.id}/admin`);
      };
    },
  };

  async function getDataFromTbaEvent() {
    if (!event) return;

    matches = [];
    teams = [];
    alliances = undefined;

    isLoadingTbaData = true;

    try {
      const [tbaMatches, tbaTeams, tbaAlliances] = await Promise.all([
        tbaGetEventMatches(event),
        tbaGetEventTeams(event),
        tbaGetEventAlliances(event),
      ]);

      if (tbaMatches?.length) matches = tbaMatches.map(({ match }) => match);
      if (tbaTeams?.length) teams = tbaTeams;
      if (tbaAlliances?.length) alliances = tbaAlliances;
    } catch (e) {
      error = "Error while trying to get data";
      console.error(e);
    }

    isLoadingTbaData = false;
  }
</script>

<span>New comp</span>

<label class="flex flex-col">
  Name
  <input bind:value={name} class="bg-neutral-800 p-2 text-theme" />
</label>

<div class="flex flex-col">
  The Blue Alliance
  <Button
    onclick={() => {
      openDialog(EditCompTbaEventKeyDialog, {
        tbaEventKey: event,
        onedit(tbaEventKey) {
          event = tbaEventKey;
          getDataFromTbaEvent();
        },
      });
    }}
  >
    <CalendarDaysIcon class="text-theme" />
    <div class="flex grow flex-col">
      {#if event}
        {event}
        <span class="text-xs font-light">Edit event</span>
      {:else}
        Add event
      {/if}
    </div>
    {#if isLoadingTbaData}
      <LoaderIcon class="animate-spin text-theme" />
    {/if}
  </Button>
</div>

{#if matches.length || teams.length || alliances?.length}
  <div class="flex flex-col gap-1 text-sm">
    {#if matches.length}
      <span>Matches: {matches.length}</span>
    {/if}
    {#if teams.length}
      <span>Teams: {teams.length}</span>
    {/if}
    {#if alliances?.length}
      <span>Alliances: {alliances.length}</span>
    {/if}
  </div>
{/if}

<div class="flex flex-wrap items-end gap-2 text-sm">
  <label class="flex grow flex-col">
    ID
    <input bind:value={id} class="bg-neutral-800 p-2 text-theme" />
  </label>
  <div class="flex gap-2">
    {#if event}
      <Button onclick={() => (id = event!)}>
        <span class={id == event ? "font-bold" : "font-light"}>Event</span>
      </Button>
    {/if}
    <Button onclick={() => (id = idb.generateId({ randomChars: 0 }))}>
      <span class={id != event ? "font-bold" : "font-light"}>Random</span>
    </Button>
  </div>
</div>

{#if error}
  <span>{error}</span>
{/if}
