<script lang="ts">
  import { CalendarDaysIcon, LoaderIcon, PlusIcon, SquareCheckBigIcon, SquareIcon, XIcon } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { nowSeconds, rerunOtherContextLoads } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { EventDB, MetaDB } from "$lib/db";
  import { Dialog } from "$lib/dialog";
  import SelectEventKeyDialog from "$lib/dialogsBeta/SelectEventKeyDialog.svelte";
  import { fetchEventData } from "$lib/fetch";
  import { idb } from "$lib/idb";
  import type { Schema } from "$lib/schema";
  import { scoutStore, teamStore } from "$lib/settings";
  import type { components } from "$lib/tba/schema";

  const ctx = Dialog.getContext();

  let event = $state<MetaDB.Event>({
    id: idb.generateId({ randomChars: 0 }),
    name: "Event",
    made: { at: 0, by: $scoutStore, team: $teamStore },
  });

  let metaTeams = $state.raw(new Map<string, MetaDB.Team>());

  let eventTeams = $state.raw(new Map<string, EventDB.Team>());
  let matches = $state.raw(new Map<Schema.MatchId, EventDB.Match>());

  let forms = $state({ id: idb.generateId({ randomChars: 0 }), match: true, pit: true });

  let error = $state("");

  let loading = $state(false);

  export const { onformsubmit }: Dialog.Exports = {
    onformsubmit() {
      event.name = event.name.trim();
      if (!event.name) {
        error = "Name can't be blank!";
        return;
      }

      const now = nowSeconds();
      event.made.at = now;

      if (metaTeams.size) {
        MetaDB.teams.setMap(metaTeams);
      }

      Promise.all([MetaDB.events.set(event), EventDB.open(event.id)])
        .catch((reason) => {
          error = `Could not create event: ${reason}`;
        })
        .then(() => {
          const existingForms = EventDB.forms.read.values();

          const matchForm: EventDB.Form | undefined =
            forms.match && !existingForms.some((f) => f.type == "match")
              ? {
                  id: "match-" + forms.id,
                  name: "Match Form",
                  type: "match",
                  controls: [],
                  made: { at: now, by: $scoutStore, team: $teamStore },
                }
              : undefined;

          const pitForm: EventDB.Form | undefined =
            forms.pit && !existingForms.some((f) => f.type == "pit")
              ? {
                  id: "pit-" + forms.id,
                  name: "Pit Form",
                  type: "pit",
                  controls: [],
                  made: { at: now, by: $scoutStore, team: $teamStore },
                }
              : undefined;

          return Promise.allSettled([
            EventDB.teams.setMap(eventTeams),
            EventDB.matches.setMap(matches),
            (matchForm || pitForm) &&
              EventDB.forms.set([matchForm, pitForm].filter((f) => f !== undefined)).catch(console.error),
          ]).finally(() => {
            rerunOtherContextLoads();
            goto(resolve("/event/[eventId]/config", { eventId: event.id }), { invalidateAll: true });
          });
        })
        .catch((reason) => {
          console.error("Event was created, but an error still occured:", reason);
        });
    },
  };

  function getDataFromTbaEvent(tbaEvent: components["schemas"]["Event"] | undefined) {
    delete event.remapTeams;
    delete event.alliances;
    metaTeams.clear();
    eventTeams.clear();
    matches.clear();

    if (!tbaEvent) {
      delete event.key;
      event.id = idb.generateId({ randomChars: 0 });
      event.name = "";
      return;
    }

    event.key = tbaEvent.key;
    event.id = tbaEvent.key;
    event.name = `${tbaEvent.year} ${tbaEvent.short_name || tbaEvent.name}`;

    if (tbaEvent.remap_teams) {
      event.remapTeams = {};
      for (const frcTeam in tbaEvent.remap_teams) {
        event.remapTeams[frcTeam.replace("frc", "")] = tbaEvent.remap_teams[frcTeam].replace("frc", "");
      }
    }

    loading = true;

    fetchEventData({ eventKey: event.key, remapTeams: event.remapTeams })
      .then((data) => {
        if (data.remapTeams) event.remapTeams = data.remapTeams;
        if (data.alliances?.length) event.alliances = data.alliances;
        if (data.metaTeams.size) metaTeams = data.metaTeams;
        if (data.eventTeams.size) eventTeams = data.eventTeams;
        if (data.matches.size) matches = data.matches;
      })
      .finally(() => (loading = false));
  }
</script>

<div class="flex items-center justify-between border-b border-neutral-600 p-3">
  <span class="w-80 font-bold">New event</span>
  <Button onclick={ctx.close}>
    <XIcon class="size-5 text-theme" />
  </Button>
</div>

<div class="flex flex-col gap-2 overflow-y-auto p-3">
  <Button
    onclick={() => {
      Dialog.open(SelectEventKeyDialog, {
        current: event.key,
        onselect: getDataFromTbaEvent,
      });
    }}
    autofocus
    class="min-h-16"
  >
    {#if loading}
      <LoaderIcon class="animate-spin text-theme" />
    {:else}
      <CalendarDaysIcon class="text-theme" />
    {/if}

    <div class="flex grow flex-col">
      {#if event.key}
        {event.key}
        <span class="text-xs font-light">Edit event key</span>
      {:else}
        Select event key
        <span class="text-xs font-light">The Blue Alliance</span>
      {/if}
    </div>

    {#if eventTeams.size || matches.size || event.alliances?.length}
      <div class="flex flex-col items-end text-xs font-light">
        {#if eventTeams.size}
          <div>{eventTeams.size} teams</div>
        {/if}
        {#if matches.size}
          <div>{matches.size} matches</div>
        {/if}
        {#if event.alliances?.length}
          <div>{event.alliances.length} alliances</div>
        {/if}
      </div>
    {/if}
  </Button>

  <label class="flex flex-col">
    Name
    <input bind:value={event.name} class="bg-neutral-800 p-2 text-theme" />
  </label>

  <div class="flex flex-wrap items-end gap-2 text-sm">
    <label class="flex grow flex-col">
      ID
      <input bind:value={event.id} size={8} class="grow bg-neutral-800 p-2 text-theme" />
    </label>
    <div class="flex gap-2">
      {#if event.key}
        <Button
          onclick={() => {
            event.id = event.key!;
            forms.id = idb.generateId({ randomChars: 0 });
          }}
        >
          <span class={event.id == event.key ? "font-bold" : "font-light"}>Event</span>
        </Button>
      {/if}
      <Button
        onclick={() => {
          event.id = idb.generateId({ randomChars: 0 });
          forms.id = event.id;
        }}
      >
        <span class={event.id != event.key ? "font-bold" : "font-light"}>Random</span>
      </Button>
    </div>
  </div>

  <div class="flex flex-col">
    Forms
    <div class="flex flex-wrap gap-2">
      <Button onclick={() => (forms.match = !forms.match)} class="grow basis-26">
        {#if forms.match}
          <SquareCheckBigIcon class="text-theme" />
        {:else}
          <SquareIcon class="text-neutral-500" />
        {/if}
        <span class={forms.match ? "font-bold" : "font-light"}>Match</span>
      </Button>
      <Button onclick={() => (forms.pit = !forms.pit)} class="grow basis-26">
        {#if forms.pit}
          <SquareCheckBigIcon class="text-theme" />
        {:else}
          <SquareIcon class="text-neutral-500" />
        {/if}
        <span class={forms.pit ? "font-bold" : "font-light"}>Pit</span>
      </Button>
    </div>
  </div>

  {#if error}
    <span>{error}</span>
  {/if}
</div>

<div class="border-t border-neutral-600 p-3">
  <Button type="submit">
    <PlusIcon class="text-theme" /> Create
  </Button>
</div>
