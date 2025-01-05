<script lang="ts">
  import { flushSync, onMount } from "svelte";
  import type { EntryFilters } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import ExportEntriesDialog from "$lib/dialogs/ExportEntriesDialog.svelte";
  import ImportEntriesFromFileDialog from "$lib/dialogs/ImportEntriesFromFileDialog.svelte";
  import ImportEntriesFromQRCodeDialog from "$lib/dialogs/ImportEntriesFromQRCodeDialog.svelte";
  import ViewEntryDialog from "$lib/dialogs/ViewEntryDialog.svelte";
  import type { Entry } from "$lib/entry";
  import { openDialog } from "$lib/dialog";
  import { objectStore } from "$lib/idb";
  import { matchTargets } from "$lib/settings";
  import { getDetailedSingleFields } from "$lib/field";
  import Header from "$lib/components/Header.svelte";
  import type { PageData } from "./$types";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  const fields = getDetailedSingleFields(data.surveyRecord, data.fieldRecords);

  let dataGrid: HTMLDivElement;

  let filters = $state<EntryFilters>({
    team: undefined,
    match: undefined,
    absent: undefined,
    target: undefined,
    exported: undefined,
  });

  let filtersApplied = $derived.by(() => {
    return Object.values(filters).filter((val) => val !== undefined).length;
  });

  let sortBy = $state<"team" | "match" | "absent" | "exported">(data.surveyType == "match" ? "match" : "team");

  let filteredEntries = $derived(data.entryRecords.filter(filterEntry).toSorted(sortEntries));

  let displayedCount = $state(10);
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

  $effect(() => {
    filters.team;
    filters.match;
    filters.absent;
    filters.target;
    filters.exported;
    sortBy;

    if (window.scrollY > dataGrid.getBoundingClientRect().top) {
      dataGrid.scrollIntoView();
    }
  });

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
    const absentCompare = a.type == "match" && b.type == "match" ? Number(b.absent) - Number(a.absent) : 0;
    const exportedCompare = Number(a.status == "exported") - Number(b.status == "exported");

    if (sortBy == "match") {
      return matchCompare || teamCompare;
    }

    if (sortBy == "absent") {
      return absentCompare || matchCompare || teamCompare;
    }

    if (sortBy == "exported") {
      return exportedCompare || matchCompare || teamCompare;
    }

    return teamCompare || matchCompare;
  }

  function refresh() {
    const entriesRequest = objectStore("entries").index("surveyId").getAll(data.surveyRecord.id);

    entriesRequest.onerror = () => {
      location.reload();
    };

    entriesRequest.onsuccess = () => {
      if (!entriesRequest.result) {
        location.reload();
        return;
      }

      data.entryRecords = entriesRequest.result;
    };
  }

  function fixEntries() {
    const cursorRequest = objectStore("entries", "readwrite").index("surveyId").openCursor(data.surveyRecord.id);
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (cursor == null) {
        data.surveyRecord.modified = new Date();
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
    };
  }

  function getFilterableTeams() {
    const teamSet = new Set(data.entryRecords.map((entry) => entry.team));
    return [...teamSet].toSorted((a, b) => parseInt(a) - parseInt(b));
  }

  function getFilterableMatches() {
    if (data.surveyType != "match") return [];

    const matchSet = new Set<number>();
    for (const entry of data.entryRecords) {
      if (entry.type != "match") continue;
      matchSet.add(entry.match);
    }

    return [...matchSet].toSorted((a, b) => b - a);
  }

  function onscroll() {
    if (displayedCount >= filteredEntries.length) return;

    if (document.body.offsetHeight <= window.scrollY + window.innerHeight * 2) {
      displayedCount = Math.min(displayedCount + 10, filteredEntries.length);
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

<div class="flex flex-wrap gap-3">
  <div class="grow basis-0">
    <div class="flex flex-wrap gap-2 pb-2">
      <Button
        onclick={() => {
          openDialog(ImportEntriesFromQRCodeDialog, {
            surveyRecord: data.surveyRecord,
            fields,
            onimport: refresh,
          });
        }}
        class="grow"
      >
        <Icon name="qrcode" />
        <div class="flex flex-col">
          Import
          <small>QR code</small>
        </div>
      </Button>
      <Button
        onclick={() => {
          openDialog(ImportEntriesFromFileDialog, {
            surveyRecord: data.surveyRecord,
            fields,
            onimport: refresh,
          });
        }}
        class="grow"
      >
        <Icon name="paste" />
        <div class="flex flex-col">
          Import
          <small>File</small>
        </div>
      </Button>
    </div>

    <div class="sticky top-0 flex flex-col gap-2 bg-neutral-900 pt-2">
      <div class="flex flex-wrap items-center">
        <h2 class="grow font-bold">Filter</h2>
        <Button onclick={resetFilters} disabled={!filtersApplied}>
          <Icon name="arrow-rotate-left" />
        </Button>
      </div>

      <div class="mb-2 flex flex-wrap gap-2">
        <label class="flex grow flex-col">
          Team
          <select
            bind:value={filters.team}
            class="bg-neutral-800 p-2 capitalize text-theme"
            class:font-bold={filters.team !== undefined}
          >
            <option value={undefined}>--</option>
            {#each getFilterableTeams() as team}
              <option>{team}</option>
            {/each}
          </select>
        </label>

        {#if data.surveyType == "match"}
          <label class="flex grow flex-col">
            Match
            <select
              bind:value={filters.match}
              class="bg-neutral-800 p-2 text-theme"
              class:font-bold={filters.match !== undefined}
            >
              <option value={undefined}>--</option>
              {#each getFilterableMatches() as match}
                <option>{match}</option>
              {/each}
            </select>
          </label>

          <label class="flex grow flex-col">
            Absent
            <select
              bind:value={filters.absent}
              class="bg-neutral-800 p-2 text-theme"
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
            class="bg-neutral-800 p-2 text-theme"
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
              class="bg-neutral-800 p-2 capitalize text-theme"
              class:font-bold={filters.target !== undefined}
            >
              <option value={undefined}>--</option>
              {#each matchTargets as value}
                <option>{value}</option>
              {/each}
            </select>
          </label>
        {/if}
      </div>

      {#if filteredEntries.length}
        <div class="flex flex-wrap gap-2">
          <Button
            onclick={() => {
              openDialog(ExportEntriesDialog, {
                surveyRecord: data.surveyRecord,
                filteredEntries,
                type: "qrcode",
                onexport: refresh,
              });
            }}
            class="grow"
          >
            <Icon name="qrcode" />
            <div class="flex flex-col">
              Export
              <small>QR code</small>
            </div>
          </Button>
          <Button
            onclick={() => {
              openDialog(ExportEntriesDialog, {
                surveyRecord: data.surveyRecord,
                filteredEntries,
                type: "file",
                onexport: refresh,
              });
            }}
            class="grow"
          >
            <Icon name="copy" />
            <div class="flex flex-col">
              Export
              <small>File</small>
            </div>
          </Button>
        </div>
      {/if}
    </div>
  </div>

  <div class="flex grow flex-col">
    {#if duplicateEntryIds.length}
      <Button onclick={fixEntries}>
        <Icon name="wrench" />
        <div class="flex flex-col">
          Fix entries
          <small>{duplicateEntryIds.length} duplicate entries were found</small>
        </div>
      </Button>
    {/if}

    <small>
      {#if filtersApplied}
        {filteredEntries.length} / {data.entryRecords.length}
        - {filtersApplied}
        {filtersApplied == 1 ? "filter" : "filters"}
      {:else}
        {data.entryRecords.length} {data.entryRecords.length == 1 ? "entry" : "entries"}
      {/if}
    </small>
    <small>Sorting by {sortBy}</small>

    <div
      bind:this={dataGrid}
      class="grid gap-2 pt-1"
      style="grid-template-columns: repeat({data.surveyType == 'match' ? 4 : 2}, min-content) auto;"
    >
      <div class="sticky top-0 z-20 col-span-full grid grid-cols-subgrid bg-neutral-900 py-2">
        <Button onclick={() => (sortBy = "team")} class="font-{sortBy == 'team' ? 'bold' : 'light'}">Team</Button>
        {#if data.surveyType == "match"}
          <Button onclick={() => (sortBy = "match")} class="font-{sortBy == 'match' ? 'bold' : 'light'}">Match</Button>
          <Button onclick={() => (sortBy = "absent")} class="font-{sortBy == 'absent' ? 'bold' : 'light'}">
            Absent
          </Button>
        {/if}
        <Button onclick={() => (sortBy = "exported")} class="font-{sortBy == 'exported' ? 'bold' : 'light'}">
          Exported
        </Button>
      </div>

      {#each displayedEntries as entry (entry.id)}
        <Button
          onclick={() => {
            openDialog(ViewEntryDialog, {
              surveyRecord: data.surveyRecord,
              fieldRecords: data.fieldRecords,
              entryRecord: entry,
              onchange: refresh,
            });
          }}
          class="col-span-full grid grid-cols-subgrid text-center"
        >
          <div>{entry.team}</div>
          {#if entry.type == "match"}
            <div>{entry.match}</div>
            <div>
              {#if entry.absent}
                <Icon name="check" />
              {/if}
            </div>
          {/if}
          <div>
            {#if entry.status == "exported"}
              <Icon name="check" />
            {/if}
          </div>
        </Button>
      {/each}
    </div>

    {#if displayedEntries.length < filteredEntries.length}
      <Button onclick={() => (displayedCount += 10)}>
        <Icon name="arrow-down" />
        Show more
      </Button>
    {/if}
  </div>
</div>
