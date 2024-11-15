<script lang="ts">
  import { flushSync, onMount } from "svelte";
  import type { EntryFilters } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import ExportEntriesDialog from "$lib/dialogs/ExportEntriesDialog.svelte";
  import ImportEntriesFromFileDialog from "$lib/dialogs/ImportEntriesFromFileDialog.svelte";
  import ImportEntriesFromQRCodeDialog from "$lib/dialogs/ImportEntriesFromQRCodeDialog.svelte";
  import ViewEntryDialog from "$lib/dialogs/ViewEntryDialog.svelte";
  import type { Entry } from "$lib/entry";
  import type { Survey } from "$lib/survey";
  import { openDialog } from "$lib/dialog";
  import { objectStore } from "$lib/idb";
  import { matchTargets } from "$lib/settings";

  let {
    surveyRecord,
    entryRecords,
  }: {
    surveyRecord: IDBRecord<Survey>;
    entryRecords: IDBRecord<Entry>[];
  } = $props();

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

  let filteredEntries = $derived(entryRecords.filter(filterEntry).toSorted(sortEntries));

  let displayedCount = $state(10);
  let displayedEntries = $derived(filteredEntries.slice(0, displayedCount));

  $effect(() => {
    filters.team;
    filters.match;
    filters.absent;
    filters.target;
    filters.exported;

    if (window.scrollY > window.innerHeight / 2) {
      window.scroll({ top: 0, left: 0 });
    }
  });

  let duplicateEntryIds = $derived.by(() => {
    if (surveyRecord.type != "match") {
      return [];
    }

    const duplicates: number[] = [];

    const uniqueStringToId = new Set<string>();
    for (const entry of entryRecords) {
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

      if (filters.target != undefined && surveyRecord.type == "match") {
        const teamsOfThisTarget = surveyRecord.matches
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
    if (a.type == "match" && b.type == "match") {
      return b.match - a.match || a.team.localeCompare(b.team, undefined, { numeric: true });
    }
    return a.team.localeCompare(b.team, undefined, { numeric: true });
  }

  function refresh() {
    const entriesRequest = objectStore("entries").index("surveyId").getAll(surveyRecord.id);

    entriesRequest.onerror = () => {
      location.reload();
    };

    entriesRequest.onsuccess = () => {
      if (!entriesRequest.result) {
        location.reload();
        return;
      }

      entryRecords = entriesRequest.result;
    };
  }

  function fixEntries() {
    const cursorRequest = objectStore("entries", "readwrite").index("surveyId").openCursor(surveyRecord.id);
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
    };
  }

  function getFilterableTeams() {
    const teamSet = new Set(entryRecords.map((entry) => entry.team));
    return [...teamSet].toSorted((a, b) => parseInt(a) - parseInt(b));
  }

  function getFilterableMatches() {
    if (surveyRecord.type != "match") return [];

    const matchSet = new Set<number>();
    for (const entry of entryRecords) {
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

  onMount(() => onscroll());
</script>

<svelte:window {onscroll} />

<Header backLink="survey/{surveyRecord.id}">
  <small>{surveyRecord.name}</small>
  <h1 class="font-bold">Entries</h1>
</Header>

<div class="flex flex-wrap gap-x-3 px-3">
  <div class="grow basis-0 pt-3">
    <div class="flex flex-wrap gap-2">
      <Button
        onclick={() => {
          openDialog(ImportEntriesFromQRCodeDialog, {
            surveyRecord,
            onimport: refresh,
          });
        }}
        classes="grow"
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
            surveyRecord,
            onimport: refresh,
          });
        }}
        classes="grow"
      >
        <Icon name="paste" />
        <div class="flex flex-col">
          Import
          <small>File</small>
        </div>
      </Button>
    </div>

    <div class="sticky top-0 flex flex-col gap-2 bg-neutral-900 pt-3">
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

        {#if surveyRecord.type == "match"}
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

        {#if surveyRecord.type == "match" && surveyRecord.matches.length}
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
                surveyRecord,
                filteredEntries,
                type: "qrcode",
                onexport: refresh,
              });
            }}
            classes="grow"
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
                surveyRecord,
                filteredEntries,
                type: "file",
                onexport: refresh,
              });
            }}
            classes="grow"
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

  <div class="flex grow flex-col pt-3">
    {#if duplicateEntryIds.length}
      <Button onclick={fixEntries}>
        <Icon name="wrench" />
        <div class="flex flex-col">
          Fix entries
          <small>{duplicateEntryIds.length} duplicate entries were found</small>
        </div>
      </Button>
    {/if}

    <span>
      {filteredEntries.length}
      {filteredEntries.length == 1 ? "result" : "results"}
      {#if filtersApplied}
        - {filtersApplied} {filtersApplied == 1 ? "filter" : "filters"}
      {/if}
    </span>

    <div
      class="grid gap-x-3 gap-y-2"
      style="grid-template-columns: repeat({surveyRecord.type == 'match' ? 4 : 2}, min-content) auto;"
    >
      <div class="sticky top-0 z-20 col-span-full grid grid-cols-subgrid bg-neutral-900 p-2">
        <div>Team</div>
        {#if surveyRecord.type == "match"}
          <div>Match</div>
          <div>Absent</div>
        {/if}
        <div>Exported</div>
      </div>

      {#each displayedEntries as entry (entry.id)}
        <Button
          onclick={() => {
            openDialog(ViewEntryDialog, {
              surveyRecord,
              entryRecord: entry,
              onchange: refresh,
            });
          }}
          classes="col-span-full grid grid-cols-subgrid text-center"
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
