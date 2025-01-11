<script lang="ts">
  import type { Match } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import EditMatchDialog from "$lib/dialogs/EditMatchDialog.svelte";
  import NewMatchDialog from "$lib/dialogs/NewMatchDialog.svelte";
  import { objectStore } from "$lib/idb";
  import { teamStore } from "$lib/settings";
  import AdminHeader from "../AdminHeader.svelte";
  import type { PageData } from "./$types";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  function getFontWeight(team: string) {
    if (!$teamStore) return "";
    if (team == $teamStore) return "font-bold underline";
    return "font-light";
  }
</script>

<AdminHeader surveyRecord={data.surveyRecord} page="matches" />

<div class="flex flex-col gap-3">
  <Button
    onclick={() =>
      openDialog(NewMatchDialog, {
        surveyRecord: data.surveyRecord,
        oncreate(match) {
          data = {
            ...data,
            surveyRecord: {
              ...data.surveyRecord,
              matches: [...data.surveyRecord.matches, match],
              modified: new Date(),
            },
          };
          objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
        },
      })}
  >
    <Icon name="plus" />
    New match
  </Button>

  {#if data.surveyRecord.matches.length}
    <div class="cool-grid grid gap-2">
      {#each data.surveyRecord.matches.toSorted((a, b) => a.number - b.number) as match (match)}
        <Button
          onclick={() => {
            openDialog(EditMatchDialog, {
              match,
              onupdate(match: Match) {
                const matches = structuredClone($state.snapshot(data.surveyRecord.matches));
                const index = matches.findIndex((m) => m.number == match.number);
                if (index >= 0) matches[index] = match;

                data = {
                  ...data,
                  surveyRecord: { ...data.surveyRecord, matches, modified: new Date() },
                };
                objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
              },
              ondelete() {
                data = {
                  ...data,
                  surveyRecord: {
                    ...data.surveyRecord,
                    matches: data.surveyRecord.matches.filter((m) => m.number != match.number),
                    modified: new Date(),
                  },
                };
                objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
              },
            });
          }}
          class="col-span-5 grid grid-cols-subgrid gap-x-3 text-center"
        >
          <div>{match.number}</div>
          <div class="col-span-3 grid grid-cols-subgrid gap-x-3">
            <div class="text-red {getFontWeight(match.red1)}">{match.red1}</div>
            <div class="text-red {getFontWeight(match.red2)}">{match.red2}</div>
            <div class="text-red {getFontWeight(match.red3)}">{match.red3}</div>
            <div class="text-blue {getFontWeight(match.blue1)}">{match.blue1}</div>
            <div class="text-blue {getFontWeight(match.blue2)}">{match.blue2}</div>
            <div class="text-blue {getFontWeight(match.blue3)}">{match.blue3}</div>
          </div>
        </Button>
      {/each}
    </div>
  {:else}
    No matches.
  {/if}
</div>

<style>
  .cool-grid {
    --column: repeat(4, min-content) auto;
    grid-template-columns: var(--column);
  }

  @media (width > 480px) {
    .cool-grid {
      grid-template-columns: var(--column) var(--column);
    }
  }

  @media (width > 720px) {
    .cool-grid {
      grid-template-columns: var(--column) var(--column) var(--column);
    }
  }

  @media (width > 960px) {
    .cool-grid {
      grid-template-columns: var(--column) var(--column) var(--column) var(--column);
    }
  }
</style>
