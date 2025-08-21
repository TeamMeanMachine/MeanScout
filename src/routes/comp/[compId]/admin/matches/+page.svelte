<script lang="ts">
  import { getMatchTeamFontWeight, type Match } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import EditMatchDialog from "$lib/dialogs/EditMatchDialog.svelte";
  import NewMatchDialog from "$lib/dialogs/NewMatchDialog.svelte";
  import { idb } from "$lib/idb";
  import { PlusIcon } from "@lucide/svelte";
  import CompAdminHeader from "../CompAdminHeader.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<div class="flex flex-col gap-6" style="view-transition-name:admin">
  <CompAdminHeader compRecord={data.compRecord} page="matches" />

  <div class="flex flex-col gap-3">
    {#if data.compRecord.matches.length}
      <div class="flex flex-wrap gap-2">
        {#each data.compRecord.matches.toSorted((a, b) => a.number - b.number) as match (match)}
          <Button
            onclick={() => {
              openDialog(EditMatchDialog, {
                match,
                onupdate(match: Match) {
                  const matches = structuredClone($state.snapshot(data.compRecord.matches));
                  const index = matches.findIndex((m) => m.number == match.number);
                  if (index >= 0) matches[index] = match;

                  data = {
                    ...data,
                    compRecord: { ...data.compRecord, matches, modified: new Date() },
                  };
                  idb.put("comps", $state.snapshot(data.compRecord));
                },
                ondelete() {
                  data = {
                    ...data,
                    compRecord: {
                      ...data.compRecord,
                      matches: data.compRecord.matches.filter((m) => m.number != match.number),
                      modified: new Date(),
                    },
                  };
                  idb.put("comps", $state.snapshot(data.compRecord));
                },
              });
            }}
            class="grow flex-nowrap! text-center!"
          >
            <div class="min-w-8">{match.number}</div>
            <div class="flex flex-col gap-x-2">
              <div class="text-red flex flex-wrap gap-x-2">
                <div class="min-w-13 {getMatchTeamFontWeight(match.red1)}">{match.red1}</div>
                <div class="min-w-13 {getMatchTeamFontWeight(match.red2)}">{match.red2}</div>
                <div class="min-w-13 {getMatchTeamFontWeight(match.red3)}">{match.red3}</div>
              </div>
              <div class="text-blue flex flex-wrap gap-x-2">
                <div class="min-w-13 {getMatchTeamFontWeight(match.blue1)}">{match.blue1}</div>
                <div class="min-w-13 {getMatchTeamFontWeight(match.blue2)}">{match.blue2}</div>
                <div class="min-w-13 {getMatchTeamFontWeight(match.blue3)}">{match.blue3}</div>
              </div>
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
              idb.put("comps", $state.snapshot(data.compRecord));
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
