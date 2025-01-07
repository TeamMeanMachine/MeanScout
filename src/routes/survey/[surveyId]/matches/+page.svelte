<script lang="ts">
  import type { Match } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import NewMatchDialog from "$lib/dialogs/NewMatchDialog.svelte";
  import ViewMatchDialog from "$lib/dialogs/ViewMatchDialog.svelte";
  import { objectStore } from "$lib/idb";
  import { modeStore } from "$lib/settings";
  import type { PageData } from "./$types";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  let upcomingMatches = $derived(
    data.surveyRecord.matches
      .filter((match) => !data.entryRecords.find((e) => e.status != "draft" && e.match == match.number))
      .toSorted((a, b) => a.number - b.number),
  );

  let previousMatches = $derived(
    data.surveyRecord.matches
      .filter((match) => data.entryRecords.find((e) => e.status != "draft" && e.match == match.number))
      .toSorted((a, b) => b.number - a.number),
  );
</script>

<Header
  title="Matches - {data.surveyRecord.name} - MeanScout"
  heading={[
    { type: "sm", text: data.surveyRecord.name },
    { type: "h1", text: "Matches" },
  ]}
  backLink="survey/{data.surveyRecord.id}"
/>

<div class="flex flex-col gap-2">
  {#if $modeStore == "admin"}
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
      class="mb-2"
    >
      <Icon name="plus" />
      New match
    </Button>
  {/if}

  {#if upcomingMatches.length || previousMatches.length}
    {#snippet teamRow(match: Match)}
      {@const onclick = () =>
        openDialog(ViewMatchDialog, {
          data,
          match,
          canEdit: true,
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
        })}

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
        <td class="w-0 p-2">{match.number}</td>
        <td class="w-0 space-y-0.5 p-2">
          <div class="text-red">{match.red1}</div>
          <div class="text-blue">{match.blue1}</div>
        </td>
        <td class="w-0 space-y-0.5 p-2">
          <div class="text-red">{match.red2}</div>
          <div class="text-blue">{match.blue2}</div>
        </td>
        <td class="w-0 space-y-0.5 p-2">
          <div class="text-red">{match.red3}</div>
          <div class="text-blue">{match.blue3}</div>
        </td>
        <td></td>
      </tr>
    {/snippet}

    <div class="flex flex-wrap gap-2">
      {#if upcomingMatches.length}
        <div class="flex grow basis-0 flex-col">
          <h2 class="font-bold">Upcoming</h2>
          <table class="border-separate border-spacing-y-2 text-center">
            <tbody>
              {#each upcomingMatches as match (match)}
                {@render teamRow(match)}
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

      {#if previousMatches.length}
        <div class="flex grow basis-0 flex-col">
          <h2 class="font-bold">Previous</h2>
          <table class="border-separate border-spacing-y-2 text-center">
            <tbody>
              {#each previousMatches as match (match)}
                {@render teamRow(match)}
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {:else}
    No matches.
  {/if}
</div>
