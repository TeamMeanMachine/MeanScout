<script lang="ts">
  import { compareMatches, getTeamName, matchUrl, sessionStorageStore } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { ArrowLeftIcon, ArrowRightIcon, SquarePenIcon, SquareArrowOutUpRightIcon } from "@lucide/svelte";
  import type { PageProps } from "./$types";
  import MatchDataTable from "$lib/components/MatchDataTable.svelte";
  import MatchRanksChart from "$lib/components/MatchRanksChart.svelte";
  import Anchor from "$lib/components/Anchor.svelte";
  import MatchPitDataTable from "$lib/components/MatchPitDataTable.svelte";
  import { openDialog } from "$lib/dialog";
  import EditMatchDialog from "$lib/dialogs/EditMatchDialog.svelte";
  import { idb } from "$lib/idb";
  import { goto } from "$app/navigation";

  let { data }: PageProps = $props();

  const showRanks = $derived(data.fieldRecords.length && data.entryRecords.length);

  const showData = sessionStorageStore<"expressions" | "raw">("entry-view-show-data", "expressions");

  function teamWonFontWeight(team: string) {
    if (!data.redWon || !data.blueWon) {
      return "";
    }

    if (data.redWon && [data.match.red1, data.match.red2, data.match.red3].includes(team)) {
      return "font-bold";
    }

    if (data.blueWon && [data.match.blue1, data.match.blue2, data.match.blue3].includes(team)) {
      return "font-bold";
    }

    return "font-light";
  }
</script>

<div class="flex flex-col gap-6 grow overflow-x-hidden lg:ml-72 2xl:ml-[512px] px-3 py-6 mt-[57px] max-lg:mb-[65px]">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="flex flex-col">
      <h2 class="font-bold">{data.title}</h2>
      {#if data.match.redScore !== undefined && data.match.blueScore !== undefined}
        <div class="text-xs">
          {#if data.redWon}
            <span class="text-red font-bold">Red</span>
            won:
          {:else if data.blueWon}
            <span class="text-blue font-bold">Blue</span>
            won:
          {:else}
            <span class="font-bold">Tied:</span>
          {/if}
          <span class="text-red {data.redWon ? 'font-bold' : 'font-light'}">{data.match.redScore}</span>
          <span>to</span>
          <span class="text-blue {data.blueWon ? 'font-bold' : 'font-light'}">{data.match.blueScore}</span>
        </div>
      {:else}
        <div class="text-xs font-light">No score</div>
      {/if}
    </div>

    <div class="flex gap-2">
      {#if data.previousMatch}
        <Anchor
          route={matchUrl(data.previousMatch, data.compRecord.id)}
          class="active:-translate-x-0.5! active:translate-y-0!"
        >
          <ArrowLeftIcon class="text-theme size-5" />
        </Anchor>
      {:else}
        <Button disabled>
          <ArrowLeftIcon class="text-theme size-5" />
        </Button>
      {/if}

      {#if data.nextMatch}
        <Anchor
          route={matchUrl(data.nextMatch, data.compRecord.id)}
          class="active:translate-x-0.5! active:translate-y-0!"
        >
          <ArrowRightIcon class="text-theme size-5" />
        </Anchor>
      {:else}
        <Button disabled>
          <ArrowRightIcon class="text-theme size-5" />
        </Button>
      {/if}

      <Button
        onclick={() => {
          openDialog(EditMatchDialog, {
            match: data.match,
            comp: data.compRecord,
            onupdate(match) {
              let matches = $state.snapshot(data.compRecord.matches);
              matches = matches.filter((m) => compareMatches(m, match) != 0);
              matches.push(match);
              matches = matches.toSorted(compareMatches);

              idb.put(
                "comps",
                $state.snapshot({
                  ...data.compRecord,
                  matches,
                  modified: new Date(),
                }),
              ).onsuccess = () => {
                goto(`#/${matchUrl(match, data.compRecord.id)}`, { replaceState: true, invalidateAll: true });
              };
            },
            ondelete() {
              idb.put(
                "comps",
                $state.snapshot({
                  ...data.compRecord,
                  matches: data.compRecord.matches.filter((m) => compareMatches(m, data.match) != 0),
                  modified: new Date(),
                }),
              ).onsuccess = () => {
                goto(`#/comp/${data.compRecord.id}/matches`, { replaceState: true, invalidateAll: true });
              };
            },
          });
        }}
        class="ml-2"
      >
        <SquarePenIcon class="text-theme size-5" />
      </Button>
    </div>
  </div>

  {#if showRanks}
    <MatchRanksChart pageData={data} match={data.match} />
  {:else}
    <div class="flex flex-col gap-2">
      <div class="flex flex-col gap-2 sm:grid sm:grid-cols-2">
        {#each [data.match.red1, data.match.red2, data.match.red3] as team, index}
          {@const order = ["sm:order-1", "sm:order-3", "sm:order-5"]}
          {@const teamName = getTeamName(team, data.compRecord.teams)}

          <Anchor route="comp/{data.compRecord.id}/teams/{team}" class={order[index]}>
            <div class="flex flex-col truncate {teamWonFontWeight(team)}">
              <span class="text-red">{team}</span>
              {#if teamName}
                <span class="truncate text-xs">{teamName}</span>
              {/if}
            </div>
          </Anchor>
        {/each}

        {#each [data.match.blue1, data.match.blue2, data.match.blue3] as team, index}
          {@const order = ["sm:order-2", "sm:order-4", "sm:order-6"]}
          {@const teamName = getTeamName(team, data.compRecord.teams)}

          <Anchor route="comp/{data.compRecord.id}/teams/{team}" class={order[index]}>
            <div class="flex flex-col truncate {teamWonFontWeight(team)}">
              <span class="text-blue">{team}</span>
              {#if teamName}
                <span class="truncate text-xs">{teamName}</span>
              {/if}
            </div>
          </Anchor>
        {/each}
      </div>

      {#each data.match.extraTeams || [] as team}
        {@const teamName = getTeamName(team, data.compRecord.teams)}

        <Anchor route="comp/{data.compRecord.id}/teams/{team}">
          <div class="flex flex-col truncate {teamWonFontWeight(team)}">
            <span>{team}</span>
            {#if teamName}
              <span class="truncate text-xs">{teamName}</span>
            {/if}
          </div>
        </Anchor>
      {/each}
    </div>
  {/if}

  {#each data.surveyRecords
    .filter((survey) => survey.type == "match")
    .toSorted((a, b) => a.name.localeCompare(b.name)) as surveyRecord}
    <div class="flex flex-col gap-1">
      <div class="flex flex-wrap items-center justify-between">
        <h2 class="text-sm">{surveyRecord.name}</h2>

        <div class="flex flex-wrap gap-2 text-sm">
          <Button
            onclick={() => {
              $showData = "expressions";
            }}
            class={$showData == "expressions" ? "font-bold" : "font-light"}
          >
            Derived
          </Button>
          <Button
            onclick={() => {
              $showData = "raw";
            }}
            class={$showData == "raw" ? "font-bold" : "font-light"}
          >
            Raw
          </Button>
        </div>
      </div>

      <div class="w-full overflow-x-auto">
        {#key data.match}
          <MatchDataTable pageData={data} {surveyRecord} match={data.match} show={$showData} />
        {/key}
      </div>
    </div>
  {/each}

  {#each data.surveyRecords
    .filter((survey) => survey.type == "pit")
    .toSorted((a, b) => a.name.localeCompare(b.name)) as surveyRecord}
    <div class="flex flex-col items-start gap-1 overflow-x-auto">
      <h2 class="sticky left-0 text-sm">{surveyRecord.name}</h2>

      {#key data.match}
        <MatchPitDataTable pageData={data} {surveyRecord} match={data.match} />
      {/key}
    </div>
  {/each}

  {#if data.compRecord.tbaEventKey}
    {@const setPart = data.match.level && data.match.level != "qm" ? (data.match.set || 1) + "m" : ""}
    {@const identifier = `${data.match.level || "qm"}${setPart}${data.match.number}`}

    <div class="flex flex-wrap gap-x-4">
      <a href="https://www.thebluealliance.com/match/{data.compRecord.tbaEventKey}_{identifier}" target="_blank">
        <span class="underline">TBA</span>
        <SquareArrowOutUpRightIcon class="text-theme inline size-4" strokeWidth={3} />
      </a>

      <a href="https://www.statbotics.io/match/{data.compRecord.tbaEventKey}_{identifier}" target="_blank">
        <span class="underline">Statbotics</span>
        <SquareArrowOutUpRightIcon class="text-theme inline size-4" strokeWidth={3} />
      </a>
    </div>
  {/if}
</div>
