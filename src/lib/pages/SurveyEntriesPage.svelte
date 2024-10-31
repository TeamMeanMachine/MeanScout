<script lang="ts">
  import { onMount } from "svelte";
  import type { EntryFilters } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import ExportEntriesDialog from "$lib/dialogs/ExportEntriesDialog.svelte";
  import FilterEntriesDialog from "$lib/dialogs/FilterEntriesDialog.svelte";
  import ImportEntriesDialog from "$lib/dialogs/ImportEntriesDialog.svelte";
  import ImportEntryDialog from "$lib/dialogs/ImportEntryDialog.svelte";
  import ViewEntryDialog from "$lib/dialogs/ViewEntryDialog.svelte";
  import type { Entry } from "$lib/entry";
  import type { Survey } from "$lib/survey";
  import { openDialog } from "$lib/dialog";
  import { objectStore } from "$lib/idb";

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

  let filteredEntries = $derived(entryRecords.filter(filterEntry).toSorted(sortEntries));

  let displayedCount = $state(10);
  let displayedEntries = $derived(filteredEntries.slice(0, displayedCount));

  let filterDetails = $derived.by(() => {
    let details = [];
    if (filters.team != undefined) {
      details.push(`Team: ${filters.team}`);
    }
    if (filters.match != undefined) {
      details.push(`Match: ${filters.match}`);
    }
    if (filters.absent != undefined) {
      details.push(`Absent: ${filters.absent}`);
    }
    if (filters.target != undefined) {
      details.push(`Target: ${filters.target}`);
    }
    if (filters.exported != undefined) {
      details.push(`Exported: ${filters.exported}`);
    }
    if (details.length == 0) {
      return "Any";
    }
    return details.join(", ");
  });

  let duplicateEntryIds = $derived.by(() => {
    if (surveyRecord.type != "match") {
      return [];
    }

    let duplicates: number[] = [];

    let uniqueStringToId = new Map<string, number>();
    for (const entry of entryRecords) {
      if (entry.type != "match") {
        continue;
      }

      const uniqueString = `${entry.team}_${entry.match}`;
      if (uniqueStringToId.has(uniqueString)) {
        duplicates.push($state.snapshot(entry).id);
      } else {
        uniqueStringToId.set(uniqueString, $state.snapshot(entry).id);
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

  function onscroll() {
    if (displayedCount >= filteredEntries.length) return;

    if (window.scrollY + window.innerHeight * 2 >= document.body.offsetHeight) {
      displayedCount = Math.min(displayedCount + 10, filteredEntries.length);
    } else {
    }
  }

  onMount(() => onscroll());
</script>

<svelte:window {onscroll} />

<Header backLink="survey/{surveyRecord.id}">
  <small>{surveyRecord.name}</small>
  <h1 class="font-bold">Entries</h1>
</Header>

<div class="flex flex-col gap-2 p-3">
  <Button onclick={() => openDialog(ImportEntriesDialog, { surveyRecord, entryRecords })}>
    <Icon name="paste" />
    <div class="flex flex-col">
      Import
      <small>File</small>
    </div>
  </Button>
  <Button onclick={() => openDialog(ImportEntryDialog, { surveyRecord, entryRecords })}>
    <Icon name="qrcode" />
    <div class="flex flex-col">
      Import
      <small>QR code</small>
    </div>
  </Button>
</div>

{#if duplicateEntryIds.length}
  <div class="flex flex-col gap-2 p-3">
    <Button onclick={fixEntries}>
      <Icon name="wrench" />
      <div class="flex flex-col">
        Fix entries
        <small>{duplicateEntryIds.length} duplicate entries were found</small>
      </div>
    </Button>
  </div>
{/if}

<div class="flex flex-col gap-2 p-3">
  <h2 class="font-bold">Entries</h2>
  <Button
    onclick={() => {
      openDialog(FilterEntriesDialog, {
        surveyRecord,
        entryRecords,
        filters,
        onfilter: (newFilters) => (filters = newFilters),
      });
    }}
    classes="flex-nowrap"
  >
    <Icon name="filter" />
    <div class="flex flex-col">
      <span>Filter</span>
      <small>{filterDetails}</small>
    </div>
  </Button>
  <span class="mt-2">
    {filteredEntries.length}
    {filteredEntries.length == 1 ? "result" : "results"}
  </span>
  {#if filteredEntries.length}
    <Button onclick={() => openDialog(ExportEntriesDialog, { surveyRecord, filteredEntries, onexport: refresh })}>
      <Icon name="share-from-square" />
      <div class="flex flex-col">
        Export
        <small>Share, download</small>
      </div>
    </Button>
    <table class="w-full border-separate border-spacing-y-2 text-left">
      <thead class="sticky top-0 bg-neutral-900">
        <tr>
          <th class="w-0 p-2">Team</th>
          {#if surveyRecord.type == "match"}
            <th class="w-0 p-2">Match</th>
            <th class="w-0 p-2">Absent</th>
          {/if}
          <th class="w-0 p-2">Exported</th>
          <td></td>
        </tr>
      </thead>
      <tbody>
        {#each displayedEntries as entry (entry.id)}
          {@const onclick = () => openDialog(ViewEntryDialog, { surveyRecord, entryRecord: entry, onchange: refresh })}
          <tr
            tabindex="0"
            role="button"
            {onclick}
            onkeydown={(e) => {
              if (e.key == " " || e.key == "Enter") {
                e.preventDefault();
                onclick();
              }
            }}
            class="button cursor-pointer bg-neutral-800"
          >
            <td class="p-2 text-right">{entry.team}</td>
            {#if entry.type == "match"}
              <td class="p-2 text-right">{entry.match}</td>
              <td class="p-2 text-center">
                {#if entry.absent}
                  <Icon name="check" />
                {/if}
              </td>
            {/if}
            <td class="p-2 text-center">
              {#if entry.status == "exported"}
                <Icon name="check" />
              {/if}
            </td>
            <td></td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
  {#if displayedEntries.length < filteredEntries.length}
    <Button onclick={() => (displayedCount += 10)}>
      <Icon name="arrow-down" />
      Show more
    </Button>
  {/if}
</div>
