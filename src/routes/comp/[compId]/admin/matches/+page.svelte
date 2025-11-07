<script lang="ts">
  import { compareMatches, getMatchTeamFontWeight, type Match } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import EditMatchDialog from "$lib/dialogs/EditMatchDialog.svelte";
  import NewMatchDialog from "$lib/dialogs/NewMatchDialog.svelte";
  import { idb } from "$lib/idb";
  import { PlusIcon } from "@lucide/svelte";
  import type { PageProps } from "./$types";
  import { invalidateAll } from "$app/navigation";

  let { data }: PageProps = $props();
</script>

<div class="flex flex-col gap-6">
  <div class="@container flex flex-col gap-3">
    {#if data.compRecord.matches.length}
      <div class="flex flex-col gap-2 @lg:flex-row @lg:flex-wrap">
        {#each data.compRecord.matches.toSorted(compareMatches) as match (match)}
          <Button
            onclick={() => {
              openDialog(EditMatchDialog, {
                match,
                onupdate(match: Match) {
                  const matches = structuredClone($state.snapshot(data.compRecord.matches));
                  const index = matches.findIndex((m) => compareMatches(m, match) == 0);
                  if (index >= 0) matches[index] = match;

                  data = {
                    ...data,
                    compRecord: { ...data.compRecord, matches, modified: new Date() },
                  };
                  idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = invalidateAll;
                },
                ondelete() {
                  data = {
                    ...data,
                    compRecord: {
                      ...data.compRecord,
                      matches: data.compRecord.matches.filter((m) => compareMatches(m, match) != 0),
                      modified: new Date(),
                    },
                  };
                  idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = invalidateAll;
                },
              });
            }}
            class="grow flex-nowrap! justify-center text-center!"
          >
            <div class="flex flex-wrap items-center gap-x-4">
              {#if match.red1 || match.red2 || match.red3}
                <div class="text-red flex flex-col gap-x-2 @lg:flex-row @lg:flex-wrap">
                  {#if match.red1}
                    <div class="min-w-13 {getMatchTeamFontWeight(match.red1)}">{match.red1}</div>
                  {/if}
                  {#if match.red2}
                    <div class="min-w-13 {getMatchTeamFontWeight(match.red2)}">{match.red2}</div>
                  {/if}
                  {#if match.red3}
                    <div class="min-w-13 {getMatchTeamFontWeight(match.red3)}">{match.red3}</div>
                  {/if}
                </div>
              {/if}

              {#if match.redScore !== undefined && match.blueScore !== undefined}
                {@const redWon = match.redScore > match.blueScore}
                {@const blueWon = match.blueScore > match.redScore}

                <div class="flex flex-col flex-wrap items-center gap-x-2 self-center">
                  <div class="min-w-8">
                    {#if match.level && match.level != "qm"}
                      {match.level}{match.set || 1}-{match.number}
                    {:else}
                      {match.number}
                    {/if}
                  </div>
                  <div class="flex items-center gap-x-2">
                    <div class="text-red min-w-8 {redWon ? 'font-bold' : 'text-sm font-light'}">
                      {match.redScore}
                    </div>
                    <div class="text-blue min-w-8 {blueWon ? 'font-bold' : 'text-sm font-light'}">
                      {match.blueScore}
                    </div>
                  </div>
                </div>
              {:else}
                <div class="min-w-8">
                  {#if match.level && match.level != "qm"}
                    {match.level}{match.set || 1}-{match.number}
                  {:else}
                    {match.number}
                  {/if}
                </div>
              {/if}

              {#if match.blue1 || match.blue2 || match.blue3}
                <div class="text-blue flex flex-col gap-x-2 @lg:flex-row @lg:flex-wrap">
                  {#if match.blue1}
                    <div class="min-w-13 {getMatchTeamFontWeight(match.blue1)}">{match.blue1}</div>
                  {/if}
                  {#if match.blue2}
                    <div class="min-w-13 {getMatchTeamFontWeight(match.blue2)}">{match.blue2}</div>
                  {/if}
                  {#if match.blue3}
                    <div class="min-w-13 {getMatchTeamFontWeight(match.blue3)}">{match.blue3}</div>
                  {/if}
                </div>
              {/if}
            </div>
          </Button>
        {/each}
      </div>
    {:else}
      <span class="text-sm">No matches.</span>
    {/if}

    <div
      class="sticky bottom-3 z-20 ml-2 flex flex-col self-start border border-neutral-500 bg-neutral-900 p-2 shadow-2xl"
    >
      <Button
        onclick={() =>
          openDialog(NewMatchDialog, {
            matches: data.compRecord.matches,
            oncreate(match) {
              data = {
                ...data,
                compRecord: {
                  ...data.compRecord,
                  matches: [...data.compRecord.matches, match],
                  modified: new Date(),
                },
              };
              idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = invalidateAll;
            },
          })}
        class="text-sm"
      >
        <PlusIcon class="text-theme size-5" />
        New match
      </Button>
    </div>
  </div>
</div>
