<script lang="ts">
  import type { Match } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import NewMatchDialog from "$lib/dialogs/NewMatchDialog.svelte";
  import ViewMatchDialog from "$lib/dialogs/ViewMatchDialog.svelte";
  import type { MatchEntry } from "$lib/entry";
  import { getDetailedSingleFields, type Field } from "$lib/field";
  import { modeStore } from "$lib/settings";
  import type { MatchSurvey } from "$lib/survey";

  let {
    surveyRecord,
    fieldRecords,
    entryRecords,
  }: {
    surveyRecord: IDBRecord<MatchSurvey>;
    fieldRecords: IDBRecord<Field>[];
    entryRecords: IDBRecord<MatchEntry>[];
  } = $props();

  const fields = getDetailedSingleFields(surveyRecord, fieldRecords);

  let upcomingMatches = $derived(
    surveyRecord.matches
      .filter((match) => !entryRecords.find((e) => e.status != "draft" && e.match == match.number))
      .toSorted((a, b) => a.number - b.number),
  );

  let previousMatches = $derived(
    surveyRecord.matches
      .filter((match) => entryRecords.find((e) => e.status != "draft" && e.match == match.number))
      .toSorted((a, b) => b.number - a.number),
  );
</script>

<div class="flex flex-col gap-2">
  {#if $modeStore == "admin"}
    <Button onclick={() => openDialog(NewMatchDialog, { surveyRecord })} class="mb-2">
      <Icon name="plus" />
      New match
    </Button>
  {/if}

  {#if upcomingMatches.length || previousMatches.length}
    {#snippet teamRow(match: Match)}
      {@const onclick = () =>
        openDialog(ViewMatchDialog, { surveyRecord, fieldRecords, entryRecords, match, canEdit: true })}

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
