<script lang="ts">
  import { goto } from "$app/navigation";
  import type { Comp } from "$lib/comp";
  import Button from "$lib/components/Button.svelte";
  import { openDialog, type DialogExports } from "$lib/dialog";
  import { idb } from "$lib/idb";
  import { CalendarDaysIcon, LoaderIcon } from "@lucide/svelte";
  import EditCompTbaEventKeyDialog from "./EditCompTbaEventKeyDialog.svelte";
  import type { Match, Team } from "$lib";
  import { tbaGetEventMatches, tbaGetEventTeams } from "$lib/tba";

  let name = $state("");
  let event = $state<string | undefined>();
  let id = $state("");
  let matches = $state<Match[]>([]);
  let teams = $state<Team[]>([]);

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
    matches = [];
    teams = [];
    isLoadingTbaData = true;

    [matches, teams] = await Promise.all([getMatchesFromTbaEvent(), getTeamsFromTbaEvent()]);
    isLoadingTbaData = false;
  }

  async function getMatchesFromTbaEvent() {
    if (!event) return [];

    const response = await tbaGetEventMatches(event);

    if (response) {
      const matches: Match[] = [];

      for (const { match } of response) {
        const matchIndex = matches.findIndex((m) => m.number == match.number);

        if (matchIndex == -1) {
          matches.push(match);
        } else {
          matches[matchIndex] = match;
        }
      }

      return matches;
    }

    return [];
  }

  async function getTeamsFromTbaEvent() {
    if (!event) return [];

    const response = await tbaGetEventTeams(event);

    if (response) {
      const teams: Team[] = [];

      for (const team of response) {
        const teamIndex = teams.findIndex((t) => t.number == team.number);

        if (teamIndex == -1) {
          teams.push(team);
        } else {
          teams[teamIndex] = team;
        }
      }

      return teams;
    }

    return [];
  }
</script>

<span>New comp</span>

<label class="flex flex-col">
  Name
  <input bind:value={name} class="text-theme bg-neutral-800 p-2" />
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
      <LoaderIcon class="text-theme animate-spin" />
    {/if}
  </Button>
</div>

{#if matches.length || teams.length}
  <div class="flex flex-col gap-1 text-sm">
    {#if matches.length}
      <span>Matches: {matches.length}</span>
    {/if}
    {#if teams.length}
      <span>Teams: {teams.length}</span>
    {/if}
  </div>
{/if}

<div class="flex flex-wrap items-end gap-2 text-sm">
  <label class="flex grow flex-col">
    ID
    <input bind:value={id} class="text-theme bg-neutral-800 p-2" />
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
