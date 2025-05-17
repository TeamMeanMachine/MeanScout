<script lang="ts">
  import { flushSync, onMount } from "svelte";
  import { sessionStorageStore, type EntryFilters } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import ExportEntriesDialog from "$lib/dialogs/ExportEntriesDialog.svelte";
  import ViewEntryDialog from "$lib/dialogs/ViewEntryDialog.svelte";
  import type { Entry } from "$lib/entry";
  import { openDialog } from "$lib/dialog";
  import { objectStore } from "$lib/idb";
  import { cameraStore, matchTargets, type MatchTarget } from "$lib/settings";
  import Header from "$lib/components/Header.svelte";
  import type { PageData } from "./$types";
  import ImportEntriesDialog from "$lib/dialogs/ImportEntriesDialog.svelte";
  import { ArrowDownIcon, ImportIcon, ShareIcon, Undo2Icon, WrenchIcon } from "@lucide/svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  const groupBy = sessionStorageStore<"match" | "team" | "scout">(
    "entries-group",
    data.surveyType == "match" ? "match" : "team",
  );

  let filterableTeams = $derived.by(() => {
    const teamSet = new Set(data.entryRecords.map((entry) => entry.team));
    return [...teamSet].toSorted((a, b) => parseInt(a) - parseInt(b));
  });

  let filterableMatches = $derived.by(() => {
    if (data.surveyType != "match") return [];

    const matchSet = new Set<number>();
    for (const entry of data.entryRecords) {
      if (entry.type != "match") continue;
      matchSet.add(entry.match);
    }

    return [...matchSet].toSorted((a, b) => b - a);
  });

  let filterableScouts = $derived.by(() => {
    if (!data.surveyRecord.scouts) return undefined;
    return [
      ...new Set([
        ...data.entryRecords.map((entry) => entry.scout).filter((scout) => scout !== undefined),
        ...(data.surveyRecord.scouts || []),
      ]),
    ].toSorted((a, b) => a.localeCompare(b));
  });

  const sessionStoredMatch = Number(sessionStorage.getItem("entries-filters-match") || NaN);

  let filters = $state<EntryFilters>({
    match: Number.isNaN(sessionStoredMatch) ? undefined : sessionStoredMatch,
    team: sessionStorage.getItem("entries-filters-team") || undefined,
    absent: JSON.parse(sessionStorage.getItem("entries-filters-absent") || "null") ?? undefined,
    target: (sessionStorage.getItem("entries-filters-target") as MatchTarget) || undefined,
    exported: JSON.parse(sessionStorage.getItem("entries-filters-exported") || "null") ?? undefined,
    scout: sessionStorage.getItem("entries-filters-scout") || undefined,
  });

  $effect(() => {
    filters.match
      ? sessionStorage.setItem("entries-filters-match", filters.match.toString())
      : sessionStorage.removeItem("entries-filters-match");
  });

  $effect(() => {
    filters.team
      ? sessionStorage.setItem("entries-filters-team", filters.team)
      : sessionStorage.removeItem("entries-filters-team");
  });

  $effect(() => {
    filters.absent !== undefined
      ? sessionStorage.setItem("entries-filters-absent", filters.absent ? "true" : "false")
      : sessionStorage.removeItem("entries-filters-absent");
  });

  $effect(() => {
    filters.target
      ? sessionStorage.setItem("entries-filters-target", filters.target)
      : sessionStorage.removeItem("entries-filters-target");
  });

  $effect(() => {
    filters.exported !== undefined
      ? sessionStorage.setItem("entries-filters-exported", filters.exported ? "true" : "false")
      : sessionStorage.removeItem("entries-filters-exported");
  });

  $effect(() => {
    filters.scout
      ? sessionStorage.setItem("entries-filters-scout", filters.scout)
      : sessionStorage.removeItem("entries-filters-scout");
  });

  let filtersApplied = $derived.by(() => {
    return Object.values(filters).filter((val) => val !== undefined).length;
  });

  let filteredEntries = $derived(data.entryRecords.filter(filterEntry).toSorted(sortEntries));

  let displayedCount = $state(20);
  let displayedEntries = $derived(filteredEntries.slice(0, displayedCount));

  let duplicateEntryIds = $derived.by(() => {
    if (data.surveyType != "match") {
      return [];
    }

    const duplicates: number[] = [];

    const uniqueStringToId = new Set<string>();
    for (const entry of data.entryRecords) {
      if (entry.type != "match") {
        continue;
      }

      const uniqueString = `${entry.team}_${entry.match}`;
      if (uniqueStringToId.has(uniqueString)) {
        duplicates.push($state.snapshot(entry).id);
      } else {
        uniqueStringToId.add(uniqueString);
      }
    }

    return duplicates;
  });

  onMount(() => onscroll());

  function filterEntry(entry: IDBRecord<Entry>) {
    if (entry.status == "draft") {
      return false;
    }

    if (filters.team?.length && entry.team != filters.team) {
      return false;
    }

    if (filters.exported == true && entry.status != "exported") {
      return false;
    }

    if (filters.exported == false && entry.status == "exported") {
      return false;
    }

    if (filters.scout?.length && entry.scout != filters.scout) {
      return false;
    }

    if (entry.type == "match") {
      if (filters.match != undefined && entry.match != filters.match) {
        return false;
      }

      if (filters.target != undefined && data.surveyType == "match") {
        const teamsOfThisTarget = data.surveyRecord.matches
          .filter((match) => match.number == entry.match)
          .map((match) => {
            switch (filters.target) {
              case "red 1":
                return match.red1;
              case "red 2":
                return match.red2;
              case "red 3":
                return match.red3;
              case "blue 1":
                return match.blue1;
              case "blue 2":
                return match.blue2;
              case "blue 3":
                return match.blue3;
            }
          });

        if (!teamsOfThisTarget.includes(entry.team)) {
          return false;
        }
      }

      if (filters.absent != undefined && filters.absent != entry.absent) {
        return false;
      }
    }

    return true;
  }

  function sortEntries(a: IDBRecord<Entry>, b: IDBRecord<Entry>) {
    const teamCompare = a.team.localeCompare(b.team, "en", { numeric: true });
    const matchCompare = a.type == "match" && b.type == "match" ? b.match - a.match : 0;
    const scoutCompare = a.scout?.localeCompare(b.scout || "");

    if ($groupBy == "match") {
      if (matchCompare == 0 && a.type == "match" && b.type == "match") {
        const match = data.surveyRecord.matches.find((m) => m.number == a.match);
        if (match) {
          const targets = [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3];
          const targetA = targets.findIndex((t) => t == a.team);
          const targetB = targets.findIndex((t) => t == b.team);
          return targetA - targetB || matchCompare || teamCompare;
        }
      }
      return matchCompare || teamCompare;
    }

    if ($groupBy == "scout") {
      return scoutCompare || matchCompare || teamCompare;
    }

    return teamCompare || matchCompare;
  }

  function refresh() {
    data = {
      ...data,
      surveyRecord: { ...data.surveyRecord, modified: new Date() },
    } as PageData;
    objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));

    const entriesRequest = objectStore("entries").index("surveyId").getAll(data.surveyRecord.id);

    entriesRequest.onerror = () => {
      location.reload();
    };

    entriesRequest.onsuccess = () => {
      if (!entriesRequest.result) {
        location.reload();
        return;
      }

      data = {
        ...data,
        entryRecords: entriesRequest.result,
      };
    };
  }

  function fixEntries() {
    const cursorRequest = objectStore("entries", "readwrite").index("surveyId").openCursor(data.surveyRecord.id);
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (cursor == null) {
        refresh();
        return;
      }

      if (duplicateEntryIds.includes(cursor.value.id)) {
        cursor.delete();
      }

      cursor.continue();
    };
  }

  function resetFilters() {
    filters = {
      team: undefined,
      match: undefined,
      absent: undefined,
      target: undefined,
      exported: undefined,
      scout: undefined,
    };
    onscroll();
  }

  function onscroll() {
    if (displayedCount >= filteredEntries.length) return;

    if (document.body.offsetHeight <= window.scrollY + window.innerHeight * 2) {
      displayedCount = Math.min(displayedCount + 20, filteredEntries.length);
      flushSync();
      onscroll();
    }
  }
</script>

<svelte:window {onscroll} />

<Header
  title="Entries - {data.surveyRecord.name} - MeanScout"
  heading={[
    { type: "sm", text: data.surveyRecord.name },
    { type: "h1", text: "Entries" },
  ]}
  backLink="survey/{data.surveyRecord.id}"
/>

<div class="flex flex-col gap-6" style="view-transition-name:entries">
  {#if duplicateEntryIds.length}
    <Button onclick={fixEntries}>
      <WrenchIcon class="text-theme" />
      <div class="flex flex-col">
        Fix entries
        <small>{duplicateEntryIds.length} duplicate entries were found</small>
      </div>
    </Button>
  {/if}

  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap gap-4">
      <div class="flex flex-col">
        <h2 class="font-bold">Filters</h2>
        <Button onclick={resetFilters} disabled={!filtersApplied}>
          <Undo2Icon class="text-theme" />
          Reset
        </Button>
      </div>

      <div class="flex grow flex-wrap gap-2">
        {#if data.surveyType == "match"}
          <label class="flex grow flex-col">
            Match
            <select
              bind:value={filters.match}
              onchange={() => {
                if (filters.match) $groupBy = "match";
                onscroll();
              }}
              class="text-theme bg-neutral-800 p-2"
              class:font-bold={filters.match !== undefined}
            >
              <option value={undefined}>--</option>
              {#each filterableMatches as match}
                <option>{match}</option>
              {/each}
            </select>
          </label>
        {/if}

        <label class="flex grow flex-col">
          Team
          <select
            bind:value={filters.team}
            onchange={() => {
              if (filters.team) $groupBy = "team";
              onscroll();
            }}
            class="text-theme bg-neutral-800 p-2 capitalize"
            class:font-bold={filters.team !== undefined}
          >
            <option value={undefined}>--</option>
            {#each filterableTeams as team}
              <option>{team}</option>
            {/each}
          </select>
        </label>

        {#if data.surveyType == "match"}
          <label class="flex grow flex-col">
            Absent
            <select
              bind:value={filters.absent}
              onchange={onscroll}
              class="text-theme bg-neutral-800 p-2"
              class:font-bold={filters.absent !== undefined}
            >
              <option value={undefined}>--</option>
              <option value={true}>True</option>
              <option value={false}>False</option>
            </select>
          </label>
        {/if}

        <label class="flex grow flex-col">
          Exported
          <select
            bind:value={filters.exported}
            onchange={onscroll}
            class="text-theme bg-neutral-800 p-2"
            class:font-bold={filters.exported !== undefined}
          >
            <option value={undefined}>--</option>
            <option value={true}>True</option>
            <option value={false}>False</option>
          </select>
        </label>

        {#if data.surveyType == "match" && data.surveyRecord.matches.length}
          <label class="flex grow flex-col">
            Target
            <select
              bind:value={filters.target}
              onchange={onscroll}
              class="text-theme bg-neutral-800 p-2 capitalize"
              class:font-bold={filters.target !== undefined}
            >
              <option value={undefined}>--</option>
              {#each matchTargets as value}
                <option>{value}</option>
              {/each}
            </select>
          </label>
        {/if}

        {#if filterableScouts?.length}
          <label class="flex grow flex-col">
            Scout
            <select
              bind:value={filters.scout}
              onchange={() => {
                if (filters.scout) $groupBy = "scout";
                onscroll();
              }}
              class="text-theme bg-neutral-800 p-2"
              class:font-bold={filters.scout !== undefined}
            >
              <option value={undefined}>--</option>
              {#each filterableScouts as scout}
                <option>{scout}</option>
              {/each}
            </select>
          </label>
        {/if}
      </div>
    </div>

    <div>
      {#if filtersApplied}
        {filteredEntries.length}<small class="font-light">/{data.entryRecords.length}</small>
        - {filtersApplied}
        {filtersApplied == 1 ? "filter" : "filters"}
      {:else}
        {data.entryRecords.length} {data.entryRecords.length == 1 ? "entry" : "entries"}
      {/if}
    </div>

    <div class="flex flex-wrap gap-2">
      <Button
        onclick={() => {
          openDialog(ExportEntriesDialog, {
            surveyRecord: data.surveyRecord,
            entries: filteredEntries,
            onexport: () => refresh(),
          });
        }}
        disabled={!filteredEntries.length}
        class="grow basis-48"
      >
        <ShareIcon class="text-theme" />
        <div class="flex flex-col">
          Export
          <small>QRF code, File</small>
        </div>
      </Button>
      <Button
        onclick={() => {
          openDialog(ImportEntriesDialog, {
            surveyRecord: data.surveyRecord,
            orderedSingleFields: data.fieldsWithDetails.orderedSingle,
            existingEntries: data.entryRecords,
            onimport: refresh,
          });
        }}
        class="grow basis-48"
      >
        <ImportIcon class="text-theme" />
        <div class="flex flex-col">
          Import
          <small>
            {#if $cameraStore}
              QRF code, File
            {:else}
              File
            {/if}
          </small>
        </div>
      </Button>
    </div>

    {#if data.surveyType == "match" && filteredEntries.length}
      <div class="flex flex-col">
        <span>Group by</span>
        <div class="flex flex-wrap gap-2">
          {#if data.surveyType == "match"}
            <Button onclick={() => ($groupBy = "match")} class={$groupBy == "match" ? "font-bold" : "font-light"}>
              Match
            </Button>
          {/if}
          <Button onclick={() => ($groupBy = "team")} class={$groupBy == "team" ? "font-bold" : "font-light"}>
            Team
          </Button>
          {#if filterableScouts?.length}
            <Button onclick={() => ($groupBy = "scout")} class={$groupBy == "scout" ? "font-bold" : "font-light"}>
              Scout
            </Button>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  {#snippet entryButton(entry: IDBRecord<Entry>)}
    <Button
      onclick={() => {
        openDialog(ViewEntryDialog, {
          surveyRecord: data.surveyRecord,
          fieldRecords: data.fieldRecords,
          entryRecord: entry,
          onchange: refresh,
        });
      }}
      class="gap-x-4"
    >
      {#if entry.type == "match" && $groupBy != "match"}
        <div class="flex flex-col">
          <small class="font-light">Match</small>
          <span>{entry.match}</span>
        </div>
      {/if}
      {#if $groupBy != "team"}
        {@const teamName = data.surveyRecord.teams.find((t) => t.number == entry.team)?.name}
        <div class="flex w-32 max-w-full flex-col">
          <small class="overflow-hidden font-light text-nowrap text-ellipsis">{teamName || "Team"}</small>
          <span>{entry.team}</span>
        </div>
      {/if}
      {#if $groupBy != "scout" && entry.type == "match" && entry.scout}
        <div class="flex w-24 max-w-full flex-col">
          <small class="font-light text-wrap">Scout</small>
          <span class="overflow-hidden text-nowrap text-ellipsis">{entry.scout}</span>
        </div>
      {/if}
      <div class="flex flex-col">
        {#if entry.type == "match"}
          <small>{entry.absent ? "Absent" : ""}</small>
        {/if}
        <small>{entry.status == "exported" ? "Exported" : ""}</small>
      </div>
    </Button>
  {/snippet}

  {#if $groupBy == "match" && data.surveyType == "match"}
    {#each filterableMatches as matchNumber}
      {@const thisMatchEntries = displayedEntries.filter((e) => e.type == "match" && e.match == matchNumber)}
      {#if thisMatchEntries.length}
        <div class="-mx-1 flex flex-col gap-2 px-1">
          <h2 class="sticky top-0 z-20 bg-neutral-900 font-bold">Match {matchNumber}</h2>
          {#each thisMatchEntries as entry (entry.id)}
            {@render entryButton(entry)}
          {/each}
        </div>
      {/if}
    {/each}
  {:else if $groupBy == "scout" && filterableScouts?.length}
    {#each ["", ...filterableScouts] as scout}
      {@const thisScoutEntries = displayedEntries.filter((e) => e.type == "match" && (e.scout || "") == scout)}
      {#if thisScoutEntries.length}
        <div class="-mx-1 flex flex-col gap-2 px-1">
          <h2 class="sticky top-0 z-20 flex flex-col bg-neutral-900 font-bold">{scout || "No name"}</h2>
          {#each thisScoutEntries as entry (entry.id)}
            {@render entryButton(entry)}
          {/each}
        </div>
      {/if}
    {/each}
  {:else}
    {#each filterableTeams as team}
      {@const thisTeamEntries = displayedEntries.filter((e) => e.team == team)}
      {#if thisTeamEntries.length}
        {@const teamName = data.surveyRecord.teams.find((t) => t.number == team)?.name}
        <div class="-mx-1 flex flex-col gap-2 px-1">
          <div class="sticky top-0 z-20 flex flex-col bg-neutral-900">
            <h2 class="font-bold">Team {team}</h2>
            {#if teamName}
              <small>{teamName}</small>
            {/if}
          </div>
          {#each thisTeamEntries as entry (entry.id)}
            {@render entryButton(entry)}
          {/each}
        </div>
      {/if}
    {/each}
  {/if}

  {#if displayedEntries.length < filteredEntries.length}
    <Button onclick={() => (displayedCount += 20)}>
      <ArrowDownIcon class="text-theme" />
      Show more
    </Button>
  {/if}
</div>
