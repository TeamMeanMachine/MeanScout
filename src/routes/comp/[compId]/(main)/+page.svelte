<script lang="ts">
  import { sessionStorageStore, type Match } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import ViewEntryDialog from "$lib/dialogs/ViewEntryDialog.svelte";
  import { entryStatuses, groupEntries, type Entry } from "$lib/entry";
  import { openDialog } from "$lib/dialog";
  import { idb } from "$lib/idb";
  import { targets, targetStore } from "$lib/settings";
  import type { PageProps } from "./$types";
  import ImportEntriesDialog from "$lib/dialogs/ImportEntriesDialog.svelte";
  import {
    ChevronDownIcon,
    ChevronRightIcon,
    DownloadIcon,
    NotepadTextIcon,
    PlusIcon,
    ShareIcon,
  } from "@lucide/svelte";
  import BulkExportDialog from "$lib/dialogs/BulkExportDialog.svelte";
  import { invalidateAll } from "$app/navigation";
  import type { Survey } from "$lib/survey";
  import NewEntryWidget from "$lib/components/NewEntryWidget.svelte";
  import { z } from "zod";
  import { onMount } from "svelte";

  let { data }: PageProps = $props();

  let newEntry = $state<{ survey: Survey; prefills: { match: number; team: string; scout: string | undefined } }>();

  onMount(() => {
    const newEntrySurvey = sessionStorage.getItem("new-entry");
    if (newEntrySurvey) {
      const survey = data.surveyRecords.find((s) => s.id == newEntrySurvey);
      const entries = data.entryRecords.filter((e) => e.surveyId == newEntrySurvey);
      if (survey) {
        newEntry = { survey, prefills: getNewEntryPrefills(survey, entries) };
      }
    }
  });

  const groupBy = sessionStorageStore<"status" | "survey" | "match" | "team" | "scout" | "target" | "absent">(
    "entries-group",
    "status",
  );

  const groupedEntries = $derived(groupEntries(data.compRecord, data.surveyRecords, data.entryRecords, $groupBy));

  const toggleStatesSchema = z
    .object({
      status: z.array(z.union(entryStatuses.map((status) => z.literal(status)))),
      survey: z.array(z.string()),
      match: z.array(z.number()),
      team: z.array(z.string()),
      scout: z.array(z.string()),
      target: z.array(z.union(targets.map((target) => z.literal(target)))),
      absent: z.array(z.boolean()),
    })
    .catch({
      status: ["draft", "submitted"],
      survey: [],
      match: [],
      team: [],
      scout: [],
      target: [],
      absent: [],
    });

  function getToggleStates() {
    try {
      return JSON.parse(sessionStorage.getItem("entries-toggle-states") ?? "null");
    } catch {}
  }

  const toggleStates = $state(toggleStatesSchema.parse(getToggleStates()));

  $effect(() => {
    sessionStorage.setItem("entries-toggle-states", JSON.stringify(toggleStates));
  });

  function getNewEntryPrefills(survey: Survey, entries: Entry[]) {
    const prefills: {
      match: number;
      team: string;
      scout: string | undefined;
    } = {
      match: 0,
      team: "",
      scout: undefined,
    };

    if (survey.type == "match") {
      const recordedMatches = entries.filter((entry) => entry.type == "match").map((entry) => entry.match);
      prefills.match = 1 + Math.max(...recordedMatches, 0);

      const matchData = data.compRecord.matches.find((match) => match.number == prefills.match);
      if (matchData) {
        switch ($targetStore) {
          case "red 1":
            prefills.team = matchData.red1;
            break;
          case "red 2":
            prefills.team = matchData.red2;
            break;
          case "red 3":
            prefills.team = matchData.red3;
            break;
          case "blue 1":
            prefills.team = matchData.blue1;
            break;
          case "blue 2":
            prefills.team = matchData.blue2;
            break;
          case "blue 3":
            prefills.team = matchData.blue3;
            break;
        }
      }

      for (const entry of entries) {
        if (
          entry.scout &&
          entry.type == "match" &&
          data.compRecord.matches.some(
            (m) => m.number == entry.match && m[$targetStore.replace(" ", "") as keyof Match] == entry.team,
          )
        ) {
          prefills.scout = entry.scout;
          break;
        }
      }
    }

    if (survey.type == "pit") {
      const scoutedTeams = entries.map((e) => e.team).toSorted((a, b) => Number(a) - Number(b));
      const unscoutedTeams = data.compRecord.teams
        .filter((t) => !scoutedTeams.includes(t.number))
        .toSorted((a, b) => Number(a.number) - Number(b.number));

      prefills.team = unscoutedTeams[0]?.number || scoutedTeams?.[0] || "";
    }

    if (!prefills.scout && entries[0] && entries[0].scout) {
      prefills.scout = entries[0].scout;
    }

    return prefills;
  }

  function refresh() {
    idb.put("comps", { ...$state.snapshot(data.compRecord), modified: new Date() }).onsuccess = invalidateAll;
  }

  function onbulkexport(exportedEntries: Entry[]) {
    const tx = idb.transaction(["comps", "entries"], "readwrite");
    const entryStore = tx.objectStore("entries");
    for (const entry of $state.snapshot(exportedEntries)) {
      if (entry.status == "exported") {
        continue;
      }
      entryStore.put({ ...entry, status: "exported", modified: new Date() });
    }
    tx.objectStore("comps").put({ ...$state.snapshot(data.compRecord), modified: new Date() });
    tx.oncomplete = invalidateAll;
  }
</script>

<div class="flex flex-col gap-6">
  {#if newEntry}
    <div class="flex flex-col gap-3">
      <NewEntryWidget
        pageData={data}
        surveyRecord={newEntry.survey}
        prefills={newEntry.prefills}
        oncancel={() => {
          sessionStorage.removeItem(`${newEntry?.survey.id}-new-entry-state`);
          sessionStorage.removeItem("new-entry");
          newEntry = undefined;
        }}
      />
    </div>
    <hr class="mb-6 border-neutral-600" />
  {:else}
    <div class="flex flex-col gap-3">
      <h2 class="font-bold">New entry</h2>

      <div class="-m-1 flex gap-3 overflow-x-auto p-1">
        {#each data.surveyRecords.toSorted((a, b) => b.modified.getTime() - a.modified.getTime()) as surveyRecord (surveyRecord.id)}
          {@const entryRecords = data.entryRecords
            .filter((e) => e.surveyId == surveyRecord.id)
            .toSorted((a, b) => b.modified.getTime() - a.modified.getTime())}

          {@const prefills = getNewEntryPrefills(surveyRecord, entryRecords)}

          <div class="flex min-w-64 grow basis-64 flex-col gap-3">
            <Button
              onclick={() => {
                newEntry = { survey: surveyRecord, prefills };
                sessionStorage.setItem("new-entry", newEntry.survey.id);
              }}
              class="flex-col items-stretch"
            >
              <div class="flex items-center gap-2">
                <PlusIcon class="text-theme shrink-0" />
                <div class="flex flex-col">
                  <span>{surveyRecord.name}</span>
                  <span class="text-xs font-light">
                    {entryRecords.filter((e) => e.status != "draft").length}
                    {#if surveyRecord.type == "match" && data.compRecord.matches.length}
                      of {data.compRecord.matches.length * 6}
                    {:else if surveyRecord.type == "pit" && data.compRecord.teams.length}
                      of {data.compRecord.teams.length}
                    {/if}
                    done
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-x-4 gap-y-2">
                {#if surveyRecord.type == "match" && prefills.match}
                  <div class="flex flex-col">
                    <span class="text-xs font-light">Match</span>
                    <span>{prefills.match}</span>
                  </div>
                {/if}
                {#if prefills.team}
                  <div class="flex flex-col">
                    <span class="text-xs font-light">
                      {data.compRecord.teams.find((t) => t.number == prefills.team)?.name || "Team"}
                    </span>
                    <span>{prefills.team}</span>
                  </div>
                {/if}
              </div>
            </Button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="flex flex-col gap-3">
    <div class="flex flex-col gap-1">
      <h2 class="font-bold">Entries</h2>

      <div class="flex flex-wrap gap-3 text-sm">
        <Button
          onclick={() => {
            const entries = data.entryRecords.filter((e) => e.status != "draft");
            openDialog(BulkExportDialog, {
              entries,
              onexport: () => onbulkexport(entries),
            });
          }}
          class="w-24 flex-col gap-1!"
        >
          <ShareIcon class="text-theme" />
          Send
        </Button>
        <Button
          onclick={() => {
            openDialog(ImportEntriesDialog, {
              surveyRecords: data.surveyRecords,
              existingEntries: data.entryRecords,
              onimport: refresh,
            });
          }}
          class="w-24 flex-col gap-1!"
        >
          <DownloadIcon class="text-theme" />
          Receive
        </Button>
      </div>
    </div>
  </div>

  {#if !data.entryRecords.length}
    <span class="text-sm">No entries.</span>
  {:else}
    <select bind:value={$groupBy} class="text-theme min-w-0 grow bg-neutral-800 p-2">
      <option value="status">Group by Status</option>
      <option value="survey">Group by Survey</option>
      <option value="match">Group by Match</option>
      <option value="team">Group by Team</option>
      <option value="scout">Group by Scout</option>
      <option value="target">Group by Target</option>
      <option value="absent">Group by Absent</option>
    </select>

    {#snippet entryButton(entry: Entry)}
      {@const survey = data.surveyRecords.find((survey) => survey.id == entry.surveyId)}

      <Button
        onclick={() => {
          openDialog(ViewEntryDialog, {
            compRecord: data.compRecord,
            surveyRecord: survey!,
            fieldRecords: data.fieldRecords,
            entryRecord: entry,
            onchange: refresh,
          });
        }}
        class="gap-x-4"
      >
        {#if entry.type == "match" && groupedEntries.by != "match"}
          <div class="flex w-9 flex-col">
            <span class="text-xs font-light">Match</span>
            <span>{entry.match}</span>
          </div>
        {:else if entry.type == "pit" && groupedEntries.by != "survey" && groupedEntries.by != "target"}
          <div class="flex w-9 flex-col">
            <span class="text-sm">Pit</span>
          </div>
        {/if}
        {#if groupedEntries.by != "team"}
          <div class="flex w-32 max-w-full flex-col">
            <span class="overflow-hidden text-xs font-light text-nowrap text-ellipsis">
              {data.teamNames.get(entry.team) || "Team"}
            </span>
            <span>{entry.team}</span>
          </div>
        {/if}
        {#if groupedEntries.by != "scout" && entry.scout}
          <div class="flex w-24 max-w-full flex-col">
            <span class="text-xs font-light text-wrap">Scout</span>
            <span class="overflow-hidden text-nowrap text-ellipsis">{entry.scout}</span>
          </div>
        {/if}
        <div class="flex flex-col">
          {#if groupedEntries.by != "absent" && entry.type == "match" && entry.absent}
            <span class="text-xs">Absent</span>
          {/if}
          {#if groupedEntries.by != "status" && entry.status != "submitted"}
            <span class="text-xs capitalize">{entry.status}</span>
          {/if}
        </div>
      </Button>
    {/snippet}

    {#if groupedEntries.by == "survey"}
      {#each groupedEntries.groups as { surveyId, entries }}
        {@const surveyName = data.surveyRecords.find((s) => s.id == surveyId)?.name}

        <div class="flex flex-col gap-2">
          <div class="flex gap-2">
            <Button
              onclick={() => {
                if (toggleStates.survey.includes(surveyId)) {
                  toggleStates.survey = toggleStates.survey.filter((val) => val != surveyId);
                } else {
                  toggleStates.survey.push(surveyId);
                }
              }}
              class="grow flex-nowrap!"
            >
              {#if toggleStates.survey.includes(surveyId)}
                <ChevronDownIcon class="text-theme shrink-0" />
              {:else}
                <ChevronRightIcon class="text-theme shrink-0" />
              {/if}
              <div class="flex grow items-center justify-between">
                <span class={toggleStates.survey.includes(surveyId) ? "font-bold" : "font-light"}>{surveyName}</span>
                <div class="flex gap-0.5 text-sm">
                  {entries.length}<NotepadTextIcon class="size-4" />
                </div>
              </div>
            </Button>
            <Button
              onclick={() => {
                openDialog(BulkExportDialog, {
                  entries,
                  onexport: () => onbulkexport(entries),
                });
              }}
            >
              <ShareIcon class="text-theme size-5" />
            </Button>
          </div>

          {#if toggleStates.survey.includes(surveyId)}
            {#each entries as entry (entry.id)}
              {@render entryButton(entry)}
            {/each}
          {/if}
        </div>
      {/each}
    {:else if groupedEntries.by == "match"}
      {#each groupedEntries.groups as { match, entries }}
        <div class="flex flex-col gap-2">
          <div class="flex gap-2">
            <Button
              onclick={() => {
                if (toggleStates.match.includes(match)) {
                  toggleStates.match = toggleStates.match.filter((val) => val != match);
                } else {
                  toggleStates.match.push(match);
                }
              }}
              class="grow flex-nowrap!"
            >
              {#if toggleStates.match.includes(match)}
                <ChevronDownIcon class="text-theme shrink-0" />
              {:else}
                <ChevronRightIcon class="text-theme shrink-0" />
              {/if}
              <div class="flex grow items-center justify-between">
                <span class={toggleStates.match.includes(match) ? "font-bold" : "font-light"}>Match {match}</span>
                <div class="flex gap-0.5 text-sm">
                  {entries.length}<NotepadTextIcon class="size-4" />
                </div>
              </div>
            </Button>
            <Button
              onclick={() => {
                openDialog(BulkExportDialog, {
                  entries,
                  onexport: () => onbulkexport(entries),
                });
              }}
            >
              <ShareIcon class="text-theme size-5" />
            </Button>
          </div>

          {#if toggleStates.match.includes(match)}
            {#each entries as entry (entry.id)}
              {@render entryButton(entry)}
            {/each}
          {/if}
        </div>
      {/each}
    {:else if groupedEntries.by == "scout"}
      {#each groupedEntries.groups as { scout, entries }}
        <div class="flex flex-col gap-2">
          <div class="flex gap-2">
            <Button
              onclick={() => {
                if (toggleStates.scout.includes(scout)) {
                  toggleStates.scout = toggleStates.scout.filter((val) => val != scout);
                } else {
                  toggleStates.scout.push(scout);
                }
              }}
              class="grow flex-nowrap!"
            >
              {#if toggleStates.scout.includes(scout)}
                <ChevronDownIcon class="text-theme shrink-0" />
              {:else}
                <ChevronRightIcon class="text-theme shrink-0" />
              {/if}
              <div class="flex grow items-center justify-between">
                <span class={toggleStates.scout.includes(scout) ? "font-bold" : "font-light"}>{scout || "No name"}</span
                >
                <div class="flex gap-0.5 text-sm">
                  {entries.length}<NotepadTextIcon class="size-4" />
                </div>
              </div>
            </Button>
            <Button
              onclick={() => {
                openDialog(BulkExportDialog, {
                  entries,
                  onexport: () => onbulkexport(entries),
                });
              }}
            >
              <ShareIcon class="text-theme size-5" />
            </Button>
          </div>

          {#if toggleStates.scout.includes(scout)}
            {#each entries as entry (entry.id)}
              {@render entryButton(entry)}
            {/each}
          {/if}
        </div>
      {/each}
    {:else if groupedEntries.by == "target"}
      {#each groupedEntries.groups as { target, entries }}
        <div class="flex flex-col gap-2">
          <div class="flex gap-2">
            <Button
              onclick={() => {
                if (toggleStates.target.includes(target)) {
                  toggleStates.target = toggleStates.target.filter((val) => val != target);
                } else {
                  toggleStates.target.push(target);
                }
              }}
              class="grow flex-nowrap!"
            >
              {#if toggleStates.target.includes(target)}
                <ChevronDownIcon class="text-theme shrink-0" />
              {:else}
                <ChevronRightIcon class="text-theme shrink-0" />
              {/if}
              <div class="flex grow items-center justify-between">
                <span class="capitalize {toggleStates.target.includes(target) ? 'font-bold' : 'font-light'}">
                  {target}
                </span>
                <div class="flex gap-0.5 text-sm">
                  {entries.length}<NotepadTextIcon class="size-4" />
                </div>
              </div>
            </Button>
            <Button
              onclick={() => {
                openDialog(BulkExportDialog, {
                  entries,
                  onexport: () => onbulkexport(entries),
                });
              }}
            >
              <ShareIcon class="text-theme size-5" />
            </Button>
          </div>

          {#if toggleStates.target.includes(target)}
            {#each entries as entry (entry.id)}
              {@render entryButton(entry)}
            {/each}
          {/if}
        </div>
      {/each}
    {:else if groupedEntries.by == "team"}
      {#each groupedEntries.groups as { team, teamName, entries }}
        <div class="flex flex-col gap-2">
          <div class="flex gap-2">
            <Button
              onclick={() => {
                if (toggleStates.team.includes(team)) {
                  toggleStates.team = toggleStates.team.filter((val) => val != team);
                } else {
                  toggleStates.team.push(team);
                }
              }}
              class="grow flex-nowrap!"
            >
              {#if toggleStates.team.includes(team)}
                <ChevronDownIcon class="text-theme shrink-0" />
              {:else}
                <ChevronRightIcon class="text-theme shrink-0" />
              {/if}
              <div class="flex grow items-center justify-between gap-x-1">
                <div class="flex flex-col">
                  <span class="font-bold">{team}</span>
                  {#if teamName}
                    <span class="text-xs {toggleStates.team.includes(team) ? 'font-bold' : 'font-light'}">
                      {teamName}
                    </span>
                  {/if}
                </div>
                <div class="flex gap-0.5 text-sm">
                  {entries.length}<NotepadTextIcon class="size-4" />
                </div>
              </div>
            </Button>
            <Button
              onclick={() => {
                openDialog(BulkExportDialog, {
                  entries,
                  onexport: () => onbulkexport(entries),
                });
              }}
            >
              <ShareIcon class="text-theme size-5" />
            </Button>
          </div>

          {#if toggleStates.team.includes(team)}
            {#each entries as entry (entry.id)}
              {@render entryButton(entry)}
            {/each}
          {/if}
        </div>
      {/each}
    {:else if groupedEntries.by == "absent"}
      {#each groupedEntries.groups as { absent, entries }}
        <div class="flex flex-col gap-2">
          <div class="flex gap-2">
            <Button
              onclick={() => {
                if (toggleStates.absent.includes(absent)) {
                  toggleStates.absent = toggleStates.absent.filter((val) => val != absent);
                } else {
                  toggleStates.absent.push(absent);
                }
              }}
              class="grow flex-nowrap!"
            >
              {#if toggleStates.absent.includes(absent)}
                <ChevronDownIcon class="text-theme shrink-0" />
              {:else}
                <ChevronRightIcon class="text-theme shrink-0" />
              {/if}
              <div class="flex grow items-center justify-between">
                <span class="capitalize {toggleStates.absent.includes(absent) ? 'font-bold' : 'font-light'}"
                  >{absent}</span
                >
                <div class="flex gap-0.5 text-sm">
                  {entries.length}<NotepadTextIcon class="size-4" />
                </div>
              </div>
            </Button>
            <Button
              onclick={() => {
                openDialog(BulkExportDialog, {
                  entries,
                  onexport: () => onbulkexport(entries),
                });
              }}
            >
              <ShareIcon class="text-theme size-5" />
            </Button>
          </div>

          {#if toggleStates.absent.includes(absent)}
            {#each entries as entry (entry.id)}
              {@render entryButton(entry)}
            {/each}
          {/if}
        </div>
      {/each}
    {:else}
      {#each groupedEntries.groups as { status, entries }}
        <div class="flex flex-col gap-2">
          <div class="flex gap-2">
            <Button
              onclick={() => {
                if (toggleStates.status.includes(status)) {
                  toggleStates.status = toggleStates.status.filter((val) => val != status);
                } else {
                  toggleStates.status.push(status);
                }
              }}
              class="grow flex-nowrap!"
            >
              {#if toggleStates.status.includes(status)}
                <ChevronDownIcon class="text-theme shrink-0" />
              {:else}
                <ChevronRightIcon class="text-theme shrink-0" />
              {/if}
              <div class="flex grow items-center justify-between">
                <span class="capitalize {toggleStates.status.includes(status) ? 'font-bold' : 'font-light'}">
                  {status}
                </span>
                <div class="flex gap-0.5 text-sm">
                  {entries.length}<NotepadTextIcon class="size-4" />
                </div>
              </div>
            </Button>
            <Button
              onclick={() => {
                openDialog(BulkExportDialog, {
                  entries,
                  onexport: () => onbulkexport(entries),
                });
              }}
            >
              <ShareIcon class="text-theme size-5" />
            </Button>
          </div>

          {#if toggleStates.status.includes(status)}
            {#each entries as entry (entry.id)}
              {@render entryButton(entry)}
            {/each}
          {/if}
        </div>
      {/each}
    {/if}
  {/if}
</div>
