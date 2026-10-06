<script lang="ts">
  import { CalendarDaysIcon, LoaderIcon, SquareCheckBigIcon, SquareIcon } from "@lucide/svelte";
  import { rerunOtherContextLoads, type Team } from "#lib";
  import { type Alliance, type Comp, type TeamsInsights } from "#lib/comp.ts";
  import Button from "#lib/components/Button.svelte";
  import { openDialog, type DialogExports } from "#lib/dialog.ts";
  import { idb, type AllData } from "#lib/idb.ts";
  import type { Match } from "#lib/match.ts";
  import type { MatchSurvey, PitSurvey } from "#lib/survey.ts";
  import { tbaGetEventAlliances, tbaGetEventMatches, tbaGetEventTeamInsights, tbaGetEventTeams } from "#lib/tba.ts";
  import { goto } from "$app/navigation";
  import EditCompTbaEventKeyDialog from "./EditCompTbaEventKeyDialog.svelte";

  let { existing }: { existing: AllData } = $props();

  let name = $state("");
  let event = $state<string | undefined>();
  let id = $state("");
  let matches = $state<Match[]>([]);
  let teams = $state<Team[]>([]);
  let alliances = $state<Alliance[] | undefined>(undefined);
  let insights = $state<TeamsInsights | undefined>(undefined);

  let createSurveys = $state({ match: true, pit: true });

  let duplicatingCompId = $state<string>();

  let error = $state("");

  let isLoadingTbaData = $state(false);

  $effect(() => {
    id = event || idb.generateId({ randomChars: 0 });
  });

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      if (error) return;

      name = name.trim();
      if (!name) {
        error = "Name can't be blank!";
        return;
      }

      const now = Date.now();

      const comp: Comp = {
        id,
        name,
        matches,
        teams,
        created: now,
        modified: now,
      };

      if (event) comp.tbaEventKey = event;
      if (alliances) comp.alliances = alliances;
      if (insights) comp.teamsInsights = insights;

      const tx = idb.transaction(["comps", "surveys", "fields"], "readwrite");
      tx.onerror = () => {
        error ||= `Could not create comp: ${tx.error?.message}`;
      };
      tx.oncomplete = () => {
        rerunOtherContextLoads();
        goto(`#/comp/${comp.id}/admin`, { refreshAll: true });
      };

      if (duplicatingCompId) {
        createDuplicates(tx, comp);
        return;
      }

      tx.objectStore("comps").add($state.snapshot(comp)).onerror = () => {
        tx.abort();
      };

      const surveyStore = tx.objectStore("surveys");

      if (createSurveys.match) {
        const matchSurvey: MatchSurvey = {
          id: `${id}-match`,
          compId: id,
          name: "Match Survey",
          type: "match",
          fieldIds: [],
          expressions: [],
          pickLists: [],
          created: now,
          modified: now,
        };

        surveyStore.add($state.snapshot(matchSurvey)).onerror = () => {
          error = "Could not create match survey";
          tx.abort();
        };
      }

      if (createSurveys.pit) {
        const pitSurvey: PitSurvey = {
          id: `${id}-pit`,
          compId: id,
          name: "Pit Survey",
          type: "pit",
          fieldIds: [],
          created: now,
          modified: now,
        };

        surveyStore.add($state.snapshot(pitSurvey)).onerror = () => {
          error = "Could not create pit survey";
          tx.abort();
        };
      }
    },
  };

  function createDuplicates(tx: IDBTransaction, comp: Comp) {
    const now = Date.now();
    const duplicatingComp = existing.comps.find((c) => c.id == duplicatingCompId);
    if (!duplicatingComp) {
      error = "Could not duplicate comp: not found";
      tx.abort();
      return;
    }

    if (duplicatingComp.scouts) {
      comp.scouts = $state.snapshot(duplicatingComp.scouts);
    }

    tx.objectStore("comps").add($state.snapshot(comp)).onerror = () => {
      error = "Could not create duplicate comp";
      tx.abort();
    };

    const duplicatingSurveys = existing.surveys
      .filter((c) => c.compId == duplicatingCompId)
      .map((survey) => ({ survey, fields: existing.fields.filter((f) => f.surveyId == survey.id) }));
    if (!duplicatingSurveys.length) return;

    const surveyStore = tx.objectStore("surveys");
    const fieldStore = tx.objectStore("fields");

    if (createSurveys.match && !duplicatingSurveys.some((s) => s.survey.type == "match")) {
      const matchSurvey: MatchSurvey = {
        id: `${id}-match`,
        compId: id,
        name: "Match Survey",
        type: "match",
        fieldIds: [],
        expressions: [],
        pickLists: [],
        created: now,
        modified: now,
      };

      surveyStore.add($state.snapshot(matchSurvey)).onerror = () => {
        error = "Could not create match survey";
        tx.abort();
      };
    }

    if (createSurveys.pit && !duplicatingSurveys.some((s) => s.survey.type == "pit")) {
      const pitSurvey: PitSurvey = {
        id: `${id}-pit`,
        compId: id,
        name: "Pit Survey",
        type: "pit",
        fieldIds: [],
        created: now,
        modified: now,
      };

      surveyStore.add($state.snapshot(pitSurvey)).onerror = () => {
        error = "Could not create pit survey";
        tx.abort();
      };
    }

    for (const duplicatedSurvey of duplicatingSurveys) {
      const duplicatedId = duplicatedSurvey.survey.id;
      const oldNewFieldIdMap = new Map<string, string>();

      const survey: (typeof duplicatedSurvey)["survey"] = {
        ...duplicatedSurvey.survey,
        id:
          duplicatedId.endsWith("-match") || duplicatedId.endsWith("-pit")
            ? `${id}-${duplicatedSurvey.survey.type}`
            : idb.generateId(),
        compId: id,
        fieldIds: duplicatedSurvey.survey.fieldIds.map((id, index) => {
          const newId = oldNewFieldIdMap.get(id) || idb.generateId() + index;
          oldNewFieldIdMap.set(id, newId);
          return newId;
        }),
        created: now,
        modified: now,
      };

      const fields = duplicatedSurvey.fields.map((f, index): typeof f => {
        const newId = oldNewFieldIdMap.get(f.id) || idb.generateId() + index;
        oldNewFieldIdMap.set(f.id, newId);
        if (f.type == "group") {
          return {
            ...f,
            id: newId,
            surveyId: survey.id,
            fieldIds: f.fieldIds.map((innerId, innerIndex) => {
              const newId = oldNewFieldIdMap.get(innerId) || idb.generateId() + (index + innerIndex);
              oldNewFieldIdMap.set(innerId, newId);
              return newId;
            }),
          };
        }
        return {
          ...f,
          id: newId,
          surveyId: survey.id,
        };
      });

      for (const field of fields) {
        fieldStore.put($state.snapshot(field)).onerror = () => {
          error = "Could not create duplicated field";
          tx.abort();
        };
      }

      if (survey.type == "match") {
        survey.pickLists = survey.pickLists.map((pl) => {
          return {
            ...pl,
            customRanks: undefined,
            omittedTeams: undefined,
            weights: pl.weights.map((w, index) => {
              if (w.from == "field") {
                const newId = oldNewFieldIdMap.get(w.fieldId) || idb.generateId() + index;
                oldNewFieldIdMap.set(w.fieldId, newId);
                w.fieldId = newId;
              }
              return w;
            }),
          };
        });

        survey.expressions = survey.expressions.map((ex) => {
          return {
            ...ex,
            input:
              ex.input.from == "fields"
                ? {
                    ...ex.input,
                    fieldIds: ex.input.fieldIds.map((id, index) => {
                      const newId = oldNewFieldIdMap.get(id) || idb.generateId() + index;
                      oldNewFieldIdMap.set(id, newId);
                      return newId;
                    }),
                  }
                : ex.input,
            inputs: ex.inputs?.map((i, index) => {
              if (i.from == "field") {
                const newId = oldNewFieldIdMap.get(i.fieldId) || idb.generateId() + index;
                oldNewFieldIdMap.set(i.fieldId, newId);
                i.fieldId = newId;
              }
              return i;
            }),
          };
        });
      }

      surveyStore.put($state.snapshot(survey)).onerror = () => {
        error = "Could not create duplicated survey";
        tx.abort();
      };
    }
  }

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

<div class="flex flex-wrap items-center justify-between gap-2">
  <span>{duplicatingCompId == undefined ? "New" : "Duplicate"} comp</span>
  {#if duplicatingCompId == undefined && existing.comps.length}
    <Button onclick={() => (duplicatingCompId = "")} class="text-sm">Duplicate</Button>
  {/if}
</div>

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

<div class="flex flex-col">
  <span>Create Surveys</span>
  <div class="flex flex-wrap gap-2">
    <Button onclick={() => (createSurveys.match = !createSurveys.match)} class="grow basis-26">
      {#if createSurveys.match}
        <SquareCheckBigIcon class="text-theme" />
      {:else}
        <SquareIcon class="text-neutral-500" />
      {/if}
      <div class="flex flex-col">
        <span class={createSurveys.match ? "font-bold" : "font-light"}>Match</span>
        <span class="text-xs font-light">{id}-match</span>
      </div>
    </Button>
    <Button onclick={() => (createSurveys.pit = !createSurveys.pit)} class="grow basis-26">
      {#if createSurveys.pit}
        <SquareCheckBigIcon class="text-theme" />
      {:else}
        <SquareIcon class="text-neutral-500" />
      {/if}
      <div class="flex flex-col">
        <span class={createSurveys.pit ? "font-bold" : "font-light"}>Pit</span>
        <span class="text-xs font-light">{id}-pit</span>
      </div>
    </Button>
  </div>
</div>

{#if duplicatingCompId != undefined && existing.comps.length}
  <div class="flex flex-col">
    Duplicate
    <span class="text-xs font-light">Only copies fields, pick lists, expressions</span>
    <div class="flex flex-col gap-2">
      {#each existing.comps as comp (comp.id)}
        {const selected = $derived(duplicatingCompId == comp.id)}
        <Button onclick={() => (duplicatingCompId = selected ? "" : comp.id)} class={[selected && "font-bold"]}>
          {#if selected}
            <SquareCheckBigIcon class="text-theme" />
          {:else}
            <SquareIcon class="text-neutral-500" />
          {/if}
          {comp.name}
        </Button>
      {/each}
    </div>
  </div>
{/if}

{#if error}
  <span>{error}</span>
{/if}
