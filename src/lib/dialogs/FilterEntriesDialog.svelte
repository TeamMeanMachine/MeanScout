<script lang="ts">
  import type { EntryFilters } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { Entry } from "$lib/entry";
  import { matchTargets } from "$lib/settings";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    entryRecords,
    filters = $bindable(),
    filterDetails,
  }: {
    surveyRecord: IDBRecord<Survey>;
    entryRecords: IDBRecord<Entry>[];
    filters: EntryFilters;
    filterDetails: string;
  } = $props();

  let dialog: ReturnType<typeof Dialog>;

  function resetFilters() {
    filters = {
      team: undefined,
      match: undefined,
      absent: undefined,
      target: undefined,
      exported: undefined,
    };
  }

  function getSuggestedTeams() {
    const teamSet = new Set<string>(entryRecords.map((entry) => entry.team));
    return [...teamSet].toSorted((a, b) => parseInt(a) - parseInt(b));
  }

  function getSuggestedMatches() {
    if (surveyRecord.type != "match") return [];

    const matchSet = new Set<number>();
    for (const entry of entryRecords) {
      if (entry.type != "match") continue;
      matchSet.add(entry.match);
    }

    return [...matchSet].toSorted((a, b) => b - a);
  }
</script>

<Button onclick={() => dialog.open()} classes="flex-nowrap">
  <Icon name="filter" />
  <div class="flex flex-col">
    <span>Filter</span>
    <small>{filterDetails}</small>
  </div>
</Button>

<Dialog bind:this={dialog}>
  <span>Filter</span>
  <div class="flex max-h-[500px] flex-col gap-2 overflow-auto p-1">
    <label class="flex flex-col">
      Team
      <select bind:value={filters.team} class="bg-neutral-800 p-2 capitalize text-theme">
        <option value={undefined}>Any</option>
        {#each getSuggestedTeams() as team}
          <option>{team}</option>
        {/each}
      </select>
    </label>
    {#if surveyRecord.type == "match"}
      <label class="flex flex-col">
        Match
        <select bind:value={filters.match} class="bg-neutral-800 p-2 text-theme">
          <option value={undefined}>Any</option>
          {#each getSuggestedMatches() as match}
            <option>{match}</option>
          {/each}
        </select>
      </label>
      <div class="flex flex-col">
        Absent
        <div class="flex flex-col gap-1">
          {#each [undefined, true, false] as value}
            <Button onclick={() => (filters.absent = value)} classes="capitalize">
              {#if filters.absent == value}
                <Icon name="circle-dot" />
                <strong>{value ?? "Any"}</strong>
              {:else}
                <Icon style="regular" name="circle" />
                {value ?? "Any"}
              {/if}
            </Button>
          {/each}
        </div>
      </div>
    {/if}
    <div class="flex flex-col">
      Exported
      <div class="flex flex-col gap-1">
        {#each [undefined, true, false] as value}
          <Button onclick={() => (filters.exported = value)} classes="capitalize">
            {#if filters.exported == value}
              <Icon name="circle-dot" />
              <strong>{value ?? "Any"}</strong>
            {:else}
              <Icon style="regular" name="circle" />
              {value ?? "Any"}
            {/if}
          </Button>
        {/each}
      </div>
    </div>
    {#if surveyRecord.type == "match"}
      {#if surveyRecord.matches.length}
        <div class="flex flex-col">
          Target
          <div class="flex flex-col gap-1">
            {#each [undefined, ...matchTargets] as value}
              <Button onclick={() => (filters.target = value)} classes="capitalize">
                {#if filters.target == value}
                  <Icon name="circle-dot" />
                  <strong>{value ?? "Any"}</strong>
                {:else}
                  <Icon style="regular" name="circle" />
                  {value ?? "Any"}
                {/if}
              </Button>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>
  <Button onclick={resetFilters}>
    <Icon name="arrow-rotate-left" />
    Reset
  </Button>
</Dialog>
