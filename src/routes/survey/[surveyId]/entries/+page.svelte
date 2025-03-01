<script lang="ts">
  import { flushSync, onMount } from "svelte";
  import { sessionStorageStore, type EntryFilters } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import ExportEntriesDialog from "$lib/dialogs/ExportEntriesDialog.svelte";
  import ImportEntriesFromFileDialog from "$lib/dialogs/ImportEntriesFromFileDialog.svelte";
  import ImportEntriesFromQRCodeDialog from "$lib/dialogs/ImportEntriesFromQRCodeDialog.svelte";
  import ViewEntryDialog from "$lib/dialogs/ViewEntryDialog.svelte";
  import type { Entry } from "$lib/entry";
  import { openDialog } from "$lib/dialog";
  import { objectStore } from "$lib/idb";
  import { cameraStore, matchTargets, type MatchTarget } from "$lib/settings";
  import Header from "$lib/components/Header.svelte";
  import type { PageData } from "./$types";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  const sortBy = sessionStorageStore<"match" | "team" | "absent" | "exported">(
    "entries-sort",
    data.surveyType == "match" ? "match" : "team",
  );

  let dataGrid: HTMLDivElement;

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

  $effect(() =>
    filters.match
      ? sessionStorage.setItem("entries-filters-match", filters.match.toString())
      : sessionStorage.removeItem("entries-filters-match"),
  );

  $effect(() =>
    filters.team
      ? sessionStorage.setItem("entries-filters-team", filters.team)
      : sessionStorage.removeItem("entries-filters-team"),
  );

  $effect(() =>
    filters.absent !== undefined
      ? sessionStorage.setItem("entries-filters-absent", filters.absent ? "true" : "false")
      : sessionStorage.removeItem("entries-filters-absent"),
  );

  $effect(() =>
    filters.target
      ? sessionStorage.setItem("entries-filters-target", filters.target)
      : sessionStorage.removeItem("entries-filters-target"),
  );

  $effect(() =>
    filters.exported !== undefined
      ? sessionStorage.setItem("entries-filters-exported", filters.exported ? "true" : "false")
      : sessionStorage.removeItem("entries-filters-exported"),
  );

  $effect(() =>
    filters.scout
      ? sessionStorage.setItem("entries-filters-scout", filters.scout)
      : sessionStorage.removeItem("entries-filters-scout"),
  );

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
    const absentCompare = a.type == "match" && b.type == "match" ? Number(b.absent) - Number(a.absent) : 0;
    const exportedCompare = Number(a.status == "exported") - Number(b.status == "exported");

    if ($sortBy == "match") {
      return matchCompare || teamCompare;
    }

    if ($sortBy == "absent") {
      return absentCompare || matchCompare || teamCompare;
    }

    if ($sortBy == "exported") {
      return exportedCompare || matchCompare || teamCompare;
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

  function scrollToTop() {
    if (window.scrollY > dataGrid.getBoundingClientRect().top) {
      dataGrid.scrollIntoView();
    }
    onscroll();
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
    scrollToTop();
  }

  function onscroll() {
    if (displayedCount >= filteredEntries.length) return;

    if (document.body.offsetHeight <= window.scrollY + window.innerHeight * 2) {
      displayedCount = Math.min(displayedCount + 20, filteredEntries.length);
      flushSync();
      onscroll();
    }
  }

  function sortButtonStyle(sort: string) {
    return sort == $sortBy ? "font-bold" : "font-light";
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

<div class="flex flex-wrap gap-3" style="view-transition-name:entries">
  <div class="grow basis-0">
    <div class="flex flex-wrap gap-2 pb-2">
      {#if $cameraStore}
        <Button
          onclick={() => {
            openDialog(ImportEntriesFromQRCodeDialog, {
              surveyRecord: data.surveyRecord,
              onimport: refresh,
            });
          }}
          class="grow"
        >
          <Icon name="qrcode" />
          <div class="flex flex-col">
            Import
            <small>QRF code</small>
          </div>
        </Button>
      {/if}
      <Button
        onclick={() => {
          openDialog(ImportEntriesFromFileDialog, {
            surveyRecord: data.surveyRecord,
            fields: data.fields,
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
        {#if data.surveyType == "match"}
          <label class="flex grow flex-col">
            Match
            <select
              bind:value={filters.match}
              onchange={scrollToTop}
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
            onchange={scrollToTop}
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
              onchange={scrollToTop}
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
            onchange={scrollToTop}
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
              onchange={scrollToTop}
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
              onchange={scrollToTop}
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
              <small>QRF code</small>
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
    <small>Sorting by {$sortBy}</small>

    <div
      bind:this={dataGrid}
      class="grid gap-2 pt-1"
      style="grid-template-columns: repeat({data.surveyType == 'match' ? 4 : 2}, min-content) auto;"
    >
      <div class="sticky top-0 z-20 col-span-full grid grid-cols-subgrid bg-neutral-900 py-2">
        {#if data.surveyType == "match"}
          <Button
            onclick={() => {
              $sortBy = "match";
              scrollToTop();
            }}
            class={sortButtonStyle("match")}
          >
            Match
          </Button>
        {/if}
        <Button
          onclick={() => {
            $sortBy = "team";
            scrollToTop();
          }}
          class={sortButtonStyle("team")}
        >
          Team
        </Button>
        {#if data.surveyType == "match"}
          <Button
            onclick={() => {
              $sortBy = "absent";
              scrollToTop();
            }}
            class={sortButtonStyle("absent")}
          >
            Absent
          </Button>
        {/if}
        <Button
          onclick={() => {
            $sortBy = "exported";
            scrollToTop();
          }}
          class={sortButtonStyle("exported")}
        >
          Exported
        </Button>
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
          class="col-span-full grid grid-cols-subgrid text-center!"
        >
          {#if entry.type == "match"}
            <div>{entry.match}</div>
          {/if}
          <div>{entry.team}</div>
          {#if entry.type == "match"}
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
      {/snippet}

      {#if $sortBy == "match" && !filters.team && !filters.target}
        {#each filterableMatches as matchNumber}
          {@const thisMatchEntries = displayedEntries.filter((e) => e.type == "match" && e.match == matchNumber)}
          {#if thisMatchEntries.length}
            {#each thisMatchEntries as entry (entry.id)}
              {@render entryButton(entry)}
            {/each}
            <div class="col-span-full"></div>
          {/if}
        {/each}
      {:else if $sortBy == "team" && !filters.match}
        {#each filterableTeams as team}
          {@const thisTeamEntries = displayedEntries.filter((e) => e.team == team)}
          {#if thisTeamEntries.length}
            {#each thisTeamEntries as entry (entry.id)}
              {@render entryButton(entry)}
            {/each}
            <div class="col-span-full"></div>
          {/if}
        {/each}
      {:else}
        {#each displayedEntries as entry (entry.id)}
          {@render entryButton(entry)}
        {/each}
      {/if}

      {#if displayedEntries.length < filteredEntries.length}
        <Button onclick={() => (displayedCount += 20)} class="col-span-full">
          <Icon name="arrow-down" />
          Show more
        </Button>
      {/if}
    </div>
  </div>
</div>
