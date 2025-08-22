<script lang="ts">
  import { sessionStorageStore } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import ViewEntryDialog from "$lib/dialogs/ViewEntryDialog.svelte";
  import { type Entry, type EntryStatus } from "$lib/entry";
  import { openDialog } from "$lib/dialog";
  import { idb } from "$lib/idb";
  import { targetStore, type Target } from "$lib/settings";
  import type { PageProps } from "./$types";
  import ImportEntriesDialog from "$lib/dialogs/ImportEntriesDialog.svelte";
  import { ChevronDownIcon, ChevronRightIcon, ImportIcon, NotepadTextIcon, ShareIcon } from "@lucide/svelte";
  import CompPageHeader from "../CompPageHeader.svelte";
  import BulkExportDialog from "$lib/dialogs/BulkExportDialog.svelte";
  import { invalidateAll } from "$app/navigation";
  import { SvelteSet } from "svelte/reactivity";
  import { onMount } from "svelte";

  let { data }: PageProps = $props();

  const groupBy = sessionStorageStore<"status" | "survey" | "match" | "team" | "scout" | "target" | "absent">(
    "entries-group",
    "status",
  );

  let statusToggleStates = new SvelteSet<EntryStatus>();
  let surveyToggleStates = new SvelteSet<string>();
  let matchToggleStates = new SvelteSet<number>();
  let teamToggleStates = new SvelteSet<string>();
  let scoutToggleStates = new SvelteSet<string>();
  let targetToggleStates = new SvelteSet<Target>();
  let absentToggleStates = new SvelteSet<boolean>();

  let bulkToggleState = $derived.by(() => {
    switch ($groupBy) {
      case "status":
        return statusToggleStates.size == data.entriesPerStatus.length;
      case "survey":
        return surveyToggleStates.size == data.entriesPerSurvey.length;
      case "match":
        return matchToggleStates.size == data.entriesPerMatch.length;
      case "team":
        return teamToggleStates.size == data.entriesPerTeam.length;
      case "scout":
        return scoutToggleStates.size == data.entriesPerScout.length;
      case "target":
        return targetToggleStates.size == data.entriesPerTarget.length;
      case "absent":
        return absentToggleStates.size == data.entriesPerAbsent.length;
    }
  });

  function toggleAll() {
    switch ($groupBy) {
      case "status":
        if (bulkToggleState) {
          statusToggleStates.clear();
        } else {
          for (const group of data.entriesPerStatus) {
            statusToggleStates.add(group.status);
          }
        }
        break;
      case "survey":
        if (bulkToggleState) {
          surveyToggleStates.clear();
        } else {
          for (const group of data.entriesPerSurvey) {
            surveyToggleStates.add(group.surveyId);
          }
        }
        break;
      case "match":
        if (bulkToggleState) {
          matchToggleStates.clear();
        } else {
          for (const group of data.entriesPerMatch) {
            matchToggleStates.add(group.match);
          }
        }
        break;
      case "team":
        if (bulkToggleState) {
          teamToggleStates.clear();
        } else {
          for (const group of data.entriesPerTeam) {
            teamToggleStates.add(group.team);
          }
        }
        break;
      case "scout":
        if (bulkToggleState) {
          scoutToggleStates.clear();
        } else {
          for (const group of data.entriesPerScout) {
            scoutToggleStates.add(group.scout);
          }
        }
        break;
      case "target":
        if (bulkToggleState) {
          targetToggleStates.clear();
        } else {
          for (const group of data.entriesPerTarget) {
            targetToggleStates.add(group.target);
          }
        }
        break;
      case "absent":
        if (bulkToggleState) {
          absentToggleStates.clear();
        } else {
          for (const group of data.entriesPerAbsent) {
            absentToggleStates.add(group.absent);
          }
        }
        break;
    }
  }

  onMount(() => {
    if (data.entriesPerStatus.find((group) => group.status == "draft")) {
      statusToggleStates.add("draft");
    }

    if (data.entriesPerStatus.find((group) => group.status == "submitted")) {
      statusToggleStates.add("submitted");
    }

    if (data.entriesPerMatch.length) {
      matchToggleStates.add(data.entriesPerMatch[0].match);
    }

    if (data.entriesPerTarget.find((group) => group.target == $targetStore)) {
      targetToggleStates.add($targetStore);
    }

    if (data.entriesPerAbsent.find((group) => group.absent)) {
      absentToggleStates.add(true);
    }
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

<CompPageHeader pageData={data} page="entries" pageTitle="Entries" />

<div class="flex flex-col gap-6 max-md:mt-11 max-md:mb-20" style="view-transition-name:entries">
  {#if !data.entryRecords.length}
    <span class="text-sm">No entries.</span>
  {:else}
    <div class="flex flex-wrap gap-4">
      <div class="flex grow gap-2">
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
        {#if entry.type == "match" && $groupBy != "match"}
          <div class="flex w-9 flex-col">
            <span class="text-xs font-light">Match</span>
            <span>{entry.match}</span>
          </div>
        {:else if entry.type == "pit" && $groupBy != "survey" && $groupBy != "target"}
          <div class="flex w-9 flex-col">
            <span class="text-sm">Pit</span>
          </div>
        {/if}
        {#if $groupBy != "team"}
          <div class="flex w-32 max-w-full flex-col">
            <span class="overflow-hidden text-xs font-light text-nowrap text-ellipsis">
              {data.teamNames.get(entry.team) || "Team"}
            </span>
            <span>{entry.team}</span>
          </div>
        {/if}
        {#if $groupBy != "scout" && entry.scout}
          <div class="flex w-24 max-w-full flex-col">
            <span class="text-xs font-light text-wrap">Scout</span>
            <span class="overflow-hidden text-nowrap text-ellipsis">{entry.scout}</span>
          </div>
        {/if}
        <div class="flex flex-col">
          {#if $groupBy != "absent" && entry.type == "match" && entry.absent}
            <span class="text-xs">Absent</span>
          {/if}
          {#if $groupBy != "status" && entry.status != "submitted"}
            <span class="text-xs capitalize">{entry.status}</span>
          {/if}
        </div>
      </Button>
    {/snippet}

    <div class="flex flex-col gap-4">
      {#if $groupBy == "survey"}
        {#each data.entriesPerSurvey as { surveyId, entries }}
          {@const surveyName = data.surveyRecords.find((s) => s.id == surveyId)?.name}

          <div class="flex flex-col gap-2">
            <div class="sticky top-0 z-20 -m-1 flex bg-neutral-900 p-1 max-md:top-14">
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
            </div>

            {#if surveyToggleStates.has(surveyId)}
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
      {:else if $groupBy == "match"}
        {#each data.entriesPerMatch as { match, entries }}
          <div class="flex flex-col gap-2">
            <div class="sticky top-0 z-20 -m-1 flex bg-neutral-900 p-1 max-md:top-14">
              <Button
                onclick={() => {
                  if (matchToggleStates.has(match)) {
                    matchToggleStates.delete(match);
                  } else {
                    matchToggleStates.add(match);
                  }
                }}
                class="grow flex-nowrap!"
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
            </div>

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
      {:else if $groupBy == "scout"}
        {#each data.entriesPerScout as { scout, entries }}
          <div class="flex flex-col gap-2">
            <div class="sticky top-0 z-20 -m-1 flex bg-neutral-900 p-1 max-md:top-14">
              <Button
                onclick={() => {
                  if (scoutToggleStates.has(scout)) {
                    scoutToggleStates.delete(scout);
                  } else {
                    scoutToggleStates.add(scout);
                  }
                }}
                class="grow flex-nowrap!"
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
            </div>

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
      {:else if $groupBy == "target"}
        {#each data.entriesPerTarget as { target, entries }}
          <div class="flex flex-col gap-2">
            <div class="sticky top-0 z-20 -m-1 flex bg-neutral-900 p-1 max-md:top-14">
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
            </div>

            {#if targetToggleStates.has(target)}
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
      {:else if $groupBy == "team"}
        {#each data.entriesPerTeam as { team, teamName, entries }}
          <div class="flex flex-col gap-2">
            <div class="sticky top-0 z-20 -m-1 flex bg-neutral-900 p-1 max-md:top-14">
              <Button
                onclick={() => {
                  if (teamToggleStates.has(team)) {
                    teamToggleStates.delete(team);
                  } else {
                    teamToggleStates.add(team);
                  }
                }}
                class="grow flex-nowrap!"
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
            </div>

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
      {:else if $groupBy == "absent"}
        {#each data.entriesPerAbsent as { absent, entries }}
          <div class="flex flex-col gap-2">
            <div class="sticky top-0 z-20 -m-1 flex bg-neutral-900 p-1 max-md:top-14">
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
            </div>

            {#if absentToggleStates.has(absent)}
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
      {:else}
        {#each data.entriesPerStatus as { status, entries }}
          <div class="flex flex-col gap-2">
            <div class="sticky top-0 z-20 -m-1 flex bg-neutral-900 p-1 max-md:top-14">
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
            </div>

            {#if statusToggleStates.has(status)}
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
      {/if}
    </div>
  {/if}
</div>
