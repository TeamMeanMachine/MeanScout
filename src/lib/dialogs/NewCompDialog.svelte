<script lang="ts">
  import { CalendarDaysIcon, LoaderIcon } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { rerunOtherContextLoads, type Team } from "$lib";
  import { type Alliance, type Comp, type TeamsInsights } from "$lib/comp";
  import Button from "$lib/components/Button.svelte";
  import { openDialog, type DialogExports } from "$lib/dialog";
  import { idb } from "$lib/idb";
  import type { Match } from "$lib/match";
  import { tbaGetEventAlliances, tbaGetEventMatches, tbaGetEventTeamInsights, tbaGetEventTeams } from "$lib/tba";
  import EditCompTbaEventKeyDialog from "./EditCompTbaEventKeyDialog.svelte";

  let name = $state("");
  let event = $state<string | undefined>();
  let id = $state("");
  let matches = $state<Match[]>([]);
  let teams = $state<Team[]>([]);
  let alliances = $state<Alliance[] | undefined>(undefined);
  let insights = $state<TeamsInsights | undefined>(undefined);

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
      if (insights) comp.teamsInsights = insights;

      const addRequest = idb.add("comps", $state.snapshot(comp));
      addRequest.onerror = () => {
        error = `Could not add comp: ${addRequest.error?.message}`;
      };

      addRequest.onsuccess = () => {
        rerunOtherContextLoads();
        goto(`#/comp/${comp.id}/admin`, { invalidateAll: true });
      };
    },
  };

  async function getDataFromTbaEvent() {
    if (!event) return;

    matches = [];
    teams = [];
    alliances = undefined;
    insights = undefined;

    isLoadingTbaData = true;

    try {
      const [tbaMatches, tbaTeams, tbaAlliances, tbaInsights] = await Promise.all([
        tbaGetEventMatches(event),
        tbaGetEventTeams(event),
        tbaGetEventAlliances(event),
        tbaGetEventTeamInsights(event),
      ]);

      if (tbaMatches?.length) matches = tbaMatches.map(({ match }) => match);
      if (tbaTeams?.length) teams = tbaTeams;
      if (tbaAlliances?.length) alliances = tbaAlliances;
      if (tbaInsights) insights = tbaInsights;
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
    {#if insights}
      <span>Insights (OPRs) found</span>
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
