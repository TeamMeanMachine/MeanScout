<script lang="ts">
  import { sessionStorageStore, type Match } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import ViewEntryDialog from "$lib/dialogs/ViewEntryDialog.svelte";
  import { groupEntries, type Entry, type EntryStatus } from "$lib/entry";
  import { openDialog } from "$lib/dialog";
  import { idb } from "$lib/idb";
  import { targetStore, type Target } from "$lib/settings";
  import type { PageProps } from "./$types";
  import ImportEntriesDialog from "$lib/dialogs/ImportEntriesDialog.svelte";
  import { ChevronDownIcon, ChevronRightIcon, ImportIcon, NotepadTextIcon, PlusIcon, ShareIcon } from "@lucide/svelte";
  import BulkExportDialog from "$lib/dialogs/BulkExportDialog.svelte";
  import { invalidateAll } from "$app/navigation";
  import { SvelteSet } from "svelte/reactivity";
  import { onMount } from "svelte";
  import type { Survey } from "$lib/survey";
  import NewEntryWidget from "$lib/components/NewEntryWidget.svelte";

  let { data }: PageProps = $props();

  let newEntry = $state<{ survey: Survey; prefills: { match: number; team: string; scout: string | undefined } }>();

  const groupBy = sessionStorageStore<"status" | "survey" | "match" | "team" | "scout" | "target" | "absent">(
    "entries-group",
    "status",
  );

  const groupedEntries = $derived(groupEntries(data.compRecord, data.surveyRecords, data.entryRecords, $groupBy));

  let statusToggleStates = new SvelteSet<EntryStatus>();
  let surveyToggleStates = new SvelteSet<string>();
  let matchToggleStates = new SvelteSet<number>();
  let teamToggleStates = new SvelteSet<string>();
  let scoutToggleStates = new SvelteSet<string>();
  let targetToggleStates = new SvelteSet<Target>();
  let absentToggleStates = new SvelteSet<boolean>();

  let bulkToggleState = $derived.by(() => {
    switch (groupedEntries.by) {
      case "status":
        return statusToggleStates.size == groupedEntries.groups.length;
      case "survey":
        return surveyToggleStates.size == groupedEntries.groups.length;
      case "match":
        return matchToggleStates.size == groupedEntries.groups.length;
      case "team":
        return teamToggleStates.size == groupedEntries.groups.length;
      case "scout":
        return scoutToggleStates.size == groupedEntries.groups.length;
      case "target":
        return targetToggleStates.size == groupedEntries.groups.length;
      case "absent":
        return absentToggleStates.size == groupedEntries.groups.length;
    }
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

  function toggleAll() {
    switch (groupedEntries.by) {
      case "status":
        if (bulkToggleState) {
          statusToggleStates.clear();
        } else {
          for (const group of groupedEntries.groups) {
            statusToggleStates.add(group.status);
          }
        }
        break;
      case "survey":
        if (bulkToggleState) {
          surveyToggleStates.clear();
        } else {
          for (const group of groupedEntries.groups) {
            surveyToggleStates.add(group.surveyId);
          }
        }
        break;
      case "match":
        if (bulkToggleState) {
          matchToggleStates.clear();
        } else {
          for (const group of groupedEntries.groups) {
            matchToggleStates.add(group.match);
          }
        }
        break;
      case "team":
        if (bulkToggleState) {
          teamToggleStates.clear();
        } else {
          for (const group of groupedEntries.groups) {
            teamToggleStates.add(group.team);
          }
        }
        break;
      case "scout":
        if (bulkToggleState) {
          scoutToggleStates.clear();
        } else {
          for (const group of groupedEntries.groups) {
            scoutToggleStates.add(group.scout);
          }
        }
        break;
      case "target":
        if (bulkToggleState) {
          targetToggleStates.clear();
        } else {
          for (const group of groupedEntries.groups) {
            targetToggleStates.add(group.target);
          }
        }
        break;
      case "absent":
        if (bulkToggleState) {
          absentToggleStates.clear();
        } else {
          for (const group of groupedEntries.groups) {
            absentToggleStates.add(group.absent);
          }
        }
        break;
    }
  }

  onMount(() => {
    const recordedMatches = data.entryRecords.filter((entry) => entry.type == "match").map((entry) => entry.match);
    const match = Math.max(...recordedMatches, 1);

    statusToggleStates.add("draft");
    statusToggleStates.add("submitted");
    matchToggleStates.add(match);
    targetToggleStates.add($targetStore);
    absentToggleStates.add(true);
  });

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

<div class="mt-9 mb-20 flex flex-col gap-6 md:mt-0">
  {#if newEntry}
    <div class="flex flex-col gap-3">
      <NewEntryWidget
        pageData={data}
        surveyRecord={newEntry.survey}
        prefills={newEntry.prefills}
        oncancel={() => (newEntry = undefined)}
      />
    </div>
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
            <Button onclick={() => (newEntry = { survey: surveyRecord, prefills })} class="flex-col items-stretch">
              <div class="flex items-center gap-2">
                <PlusIcon class="text-theme shrink-0" />
                <div class="flex flex-col">
                  <span>{surveyRecord.name}</span>
                  <span class="text-xs font-light">
                    {entryRecords.filter((e) => e.status != "draft").length}
                    {#if surveyRecord.type == "match" && data.compRecord.matches.length}
                      of {data.compRecord.matches.length * 6}
                    {:else if data.compRecord.teams.length}
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

    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h2 class="font-bold">Entries</h2>
        <Button
          onclick={() => {
            openDialog(ImportEntriesDialog, {
              surveyRecords: data.surveyRecords,
              existingEntries: data.entryRecords,
              onimport: refresh,
            });
          }}
          class="text-sm"
        >
          <ImportIcon class="text-theme size-5" />
          Import
        </Button>
      </div>

      {#if !data.entryRecords.length}
        <span class="text-sm">No entries.</span>
      {:else}
        <div class="flex gap-2">
          <Button onclick={toggleAll}>
            {#if bulkToggleState}
              <ChevronDownIcon class="text-theme" />
            {:else}
              <ChevronRightIcon class="text-theme" />
            {/if}
          </Button>
          <select bind:value={$groupBy} class="text-theme min-w-0 grow bg-neutral-800 p-2">
            <option value="status">Group by Status</option>
            <option value="survey">Group by Survey</option>
            <option value="match">Group by Match</option>
            <option value="team">Group by Team</option>
            <option value="scout">Group by Scout</option>
            <option value="target">Group by Target</option>
            <option value="absent">Group by Absent</option>
          </select>
        </div>
      {/if}
    </div>

    {#if data.entryRecords.length}
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
                  if (surveyToggleStates.has(surveyId)) {
                    surveyToggleStates.delete(surveyId);
                  } else {
                    surveyToggleStates.add(surveyId);
                  }
                }}
                class="grow flex-nowrap!"
              >
                {#if surveyToggleStates.has(surveyId)}
                  <ChevronDownIcon class="text-theme shrink-0" />
                {:else}
                  <ChevronRightIcon class="text-theme shrink-0" />
                {/if}
                <div class="flex grow items-center justify-between">
                  <span class={surveyToggleStates.has(surveyId) ? "font-bold" : "font-light"}>{surveyName}</span>
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
                class="flex-nowrap! text-sm"
              >
                <ShareIcon class="text-theme size-5" />
                <span class="max-sm:hidden">Export</span>
              </Button>
            </div>

            {#if surveyToggleStates.has(surveyId)}
              {#each entries as entry (entry.id)}
                {@render entryButton(entry)}
              {/each}
            {/if}
          </div>
        {/each}
      {:else if groupedEntries.by == "match"}
        {#each groupedEntries.groups as { match, entries }}
          <div class="flex flex-col gap-2">
            <Button
              onclick={() => {
                if (matchToggleStates.has(match)) {
                  matchToggleStates.delete(match);
                } else {
                  matchToggleStates.add(match);
                }
              }}
              class="flex-nowrap!"
            >
              {#if matchToggleStates.has(match)}
                <ChevronDownIcon class="text-theme shrink-0" />
              {:else}
                <ChevronRightIcon class="text-theme shrink-0" />
              {/if}
              <div class="flex grow items-center justify-between">
                <span class={matchToggleStates.has(match) ? "font-bold" : "font-light"}>Match {match}</span>
                <div class="flex gap-0.5 text-sm">
                  {entries.length}<NotepadTextIcon class="size-4" />
                </div>
              </div>
            </Button>

            {#if matchToggleStates.has(match)}
              <Button
                onclick={() => {
                  openDialog(BulkExportDialog, {
                    entries,
                    onexport: () => onbulkexport(entries),
                  });
                }}
                class="self-start text-sm"
              >
                <ShareIcon class="text-theme size-5" />
                Export
              </Button>
              {#each entries as entry (entry.id)}
                {@render entryButton(entry)}
              {/each}
            {/if}
          </div>
        {/each}
      {:else if groupedEntries.by == "scout"}
        {#each groupedEntries.groups as { scout, entries }}
          <div class="flex flex-col gap-2">
            <Button
              onclick={() => {
                if (scoutToggleStates.has(scout)) {
                  scoutToggleStates.delete(scout);
                } else {
                  scoutToggleStates.add(scout);
                }
              }}
              class="flex-nowrap!"
            >
              {#if scoutToggleStates.has(scout)}
                <ChevronDownIcon class="text-theme shrink-0" />
              {:else}
                <ChevronRightIcon class="text-theme shrink-0" />
              {/if}
              <div class="flex grow items-center justify-between">
                <span class={scoutToggleStates.has(scout) ? "font-bold" : "font-light"}>{scout || "No name"}</span>
                <div class="flex gap-0.5 text-sm">
                  {entries.length}<NotepadTextIcon class="size-4" />
                </div>
              </div>
            </Button>

            {#if scoutToggleStates.has(scout)}
              <Button
                onclick={() => {
                  openDialog(BulkExportDialog, {
                    entries,
                    onexport: () => onbulkexport(entries),
                  });
                }}
                class="self-start text-sm"
              >
                <ShareIcon class="text-theme size-5" />
                Export
              </Button>
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
                  if (targetToggleStates.has(target)) {
                    targetToggleStates.delete(target);
                  } else {
                    targetToggleStates.add(target);
                  }
                }}
                class="grow flex-nowrap!"
              >
                {#if targetToggleStates.has(target)}
                  <ChevronDownIcon class="text-theme shrink-0" />
                {:else}
                  <ChevronRightIcon class="text-theme shrink-0" />
                {/if}
                <div class="flex grow items-center justify-between">
                  <span class="capitalize {targetToggleStates.has(target) ? 'font-bold' : 'font-light'}">{target}</span>
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
                class="flex-nowrap! text-sm"
              >
                <ShareIcon class="text-theme size-5" />
                <span class="max-sm:hidden">Export</span>
              </Button>
            </div>

            {#if targetToggleStates.has(target)}
              {#each entries as entry (entry.id)}
                {@render entryButton(entry)}
              {/each}
            {/if}
          </div>
        {/each}
      {:else if groupedEntries.by == "team"}
        {#each groupedEntries.groups as { team, teamName, entries }}
          <div class="flex flex-col gap-2">
            <Button
              onclick={() => {
                if (teamToggleStates.has(team)) {
                  teamToggleStates.delete(team);
                } else {
                  teamToggleStates.add(team);
                }
              }}
              class="flex-nowrap!"
            >
              {#if teamToggleStates.has(team)}
                <ChevronDownIcon class="text-theme shrink-0" />
              {:else}
                <ChevronRightIcon class="text-theme shrink-0" />
              {/if}
              <div class="flex grow items-center justify-between gap-x-1">
                <div class="flex flex-col">
                  <span class="font-bold">{team}</span>
                  {#if teamName}
                    <span class="text-xs {teamToggleStates.has(team) ? 'font-bold' : 'font-light'}">{teamName}</span>
                  {/if}
                </div>
                <div class="flex gap-0.5 text-sm">
                  {entries.length}<NotepadTextIcon class="size-4" />
                </div>
              </div>
            </Button>

            {#if teamToggleStates.has(team)}
              <Button
                onclick={() => {
                  openDialog(BulkExportDialog, {
                    entries,
                    onexport: () => onbulkexport(entries),
                  });
                }}
                class="self-start text-sm"
              >
                <ShareIcon class="text-theme size-5" />
                Export
              </Button>
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
                  if (absentToggleStates.has(absent)) {
                    absentToggleStates.delete(absent);
                  } else {
                    absentToggleStates.add(absent);
                  }
                }}
                class="grow flex-nowrap!"
              >
                {#if absentToggleStates.has(absent)}
                  <ChevronDownIcon class="text-theme shrink-0" />
                {:else}
                  <ChevronRightIcon class="text-theme shrink-0" />
                {/if}
                <div class="flex grow items-center justify-between">
                  <span class="capitalize {absentToggleStates.has(absent) ? 'font-bold' : 'font-light'}">{absent}</span>
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
                class="flex-nowrap! text-sm"
              >
                <ShareIcon class="text-theme size-5" />
                <span class="max-sm:hidden">Export</span>
              </Button>
            </div>

            {#if absentToggleStates.has(absent)}
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
                  if (statusToggleStates.has(status)) {
                    statusToggleStates.delete(status);
                  } else {
                    statusToggleStates.add(status);
                  }
                }}
                class="grow flex-nowrap!"
              >
                {#if statusToggleStates.has(status)}
                  <ChevronDownIcon class="text-theme shrink-0" />
                {:else}
                  <ChevronRightIcon class="text-theme shrink-0" />
                {/if}
                <div class="flex grow items-center justify-between">
                  <span class="capitalize {statusToggleStates.has(status) ? 'font-bold' : 'font-light'}">{status}</span>
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
                class="flex-nowrap! text-sm"
              >
                <ShareIcon class="text-theme size-5" />
                <span class="max-sm:hidden">Export</span>
              </Button>
            </div>

            {#if statusToggleStates.has(status)}
              {#each entries as entry (entry.id)}
                {@render entryButton(entry)}
              {/each}
            {/if}
          </div>
        {/each}
      {/if}
    {/if}
  {/if}
</div>
