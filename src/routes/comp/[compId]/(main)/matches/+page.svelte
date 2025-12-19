<script lang="ts">
  import { compareMatches, matchUrl, type Match } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { teamStore } from "$lib/settings";
  import { ChevronDownIcon, ChevronRightIcon, ListOrderedIcon, PlusIcon } from "@lucide/svelte";
  import type { PageProps } from "./$types";
  import { z } from "zod";
  import { goto, invalidateAll } from "$app/navigation";
  import Anchor from "$lib/components/Anchor.svelte";
  import { openDialog } from "$lib/dialog";
  import { idb } from "$lib/idb";
  import EditMatchDialog from "$lib/dialogs/EditMatchDialog.svelte";
  import { slide } from "svelte/transition";

  let { data }: PageProps = $props();

  const debounceTimeMillis = 500;
  let debounceTimer: number | undefined = undefined;

  let debouncedSearch = $state(sessionStorage.getItem("match-search") || "");

  const debouncedSearchParts = $derived(
    debouncedSearch
      .split(" ")
      .map((part) => part.trim())
      .filter((part) => part)
      .map((part) => parseInt(part).toString()),
  );

  const filteredMatches = $derived(data.matches.filter(filterMatch));

  const matchToggleStateSchema = z.array(z.union([z.literal("upcoming"), z.literal("previous")])).catch(["upcoming"]);

  function getToggleState() {
    try {
      return JSON.parse(sessionStorage.getItem("matches-toggle-state") ?? "null");
    } catch {}
  }

  let matchToggleState = $state(matchToggleStateSchema.parse(getToggleState()));

  $effect(() => {
    sessionStorage.setItem("matches-toggle-state", JSON.stringify(matchToggleState));
  });

  const upcomingMatches = $derived(
    data.lastCompletedMatch
      ? filteredMatches.filter((match) => compareMatches(match, data.lastCompletedMatch!) > 0)
      : filteredMatches,
  );

  const previousMatches = $derived(
    data.lastCompletedMatch
      ? filteredMatches.filter((match) => compareMatches(match, data.lastCompletedMatch!) <= 0).toReversed()
      : [],
  );

  function onsearchinput(value: string) {
    window.clearTimeout(debounceTimer);

    debounceTimer = window.setTimeout(() => {
      debouncedSearch = value;
      sessionStorage.setItem("match-search", debouncedSearch);
    }, debounceTimeMillis);
  }

  function onsearchenter() {
    if (upcomingMatches.length) {
      goto(`#/${matchUrl(upcomingMatches[0], data.compRecord.id)}`);
    } else if (previousMatches.length) {
      goto(`#/${matchUrl(previousMatches[0], data.compRecord.id)}`);
    }
  }

  function filterMatch(match: Match & { extraTeams?: string[] }) {
    if (!debouncedSearch) return true;

    return debouncedSearchParts.every((part) => {
      const queryables = [
        match.number.toString(),
        match.red1,
        match.red2,
        match.red3,
        match.blue1,
        match.blue2,
        match.blue3,
      ];

      if (match.extraTeams) queryables.push(...match.extraTeams);
      if (match.set && match.set > 1) queryables.push(match.set.toString());

      return queryables.some((team) => {
        return parseInt(team).toString() == part;
      });
    });
  }

  function teamSearchFontWeight(team: string) {
    if (debouncedSearch && debouncedSearchParts.includes(parseInt(team).toString())) {
      return "underline underline-offset-6";
    }

    if (!debouncedSearch && $teamStore == team) {
      return "underline underline-offset-6";
    }

    return "";
  }

  function allianceFontWeight(winner: boolean | undefined) {
    if (winner == undefined) return "";
    return winner ? "font-bold" : "font-light";
  }
</script>

<div class="flex flex-col space-y-6 mx-auto max-w-(--breakpoint-lg) w-full mt-[57px] px-3 py-6 max-lg:mb-[65px]">
  {#if !data.matches.length}
    <div class="flex flex-col gap-3">
      <h2 class="font-bold">Matches</h2>
      <span class="text-sm">No matches.</span>
    </div>
  {:else}
    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Matches</h2>
      <label class="flex flex-col text-sm">
        Search
        <input
          {@attach (input) => {
            if (sessionStorage.getItem("match-search")) {
              input.focus();
              input.select();
            }
          }}
          value={debouncedSearch}
          oninput={(e) => onsearchinput(e.currentTarget.value)}
          onkeypress={(e) => e.key == "Enter" && onsearchenter()}
          class="text-theme bg-neutral-800 p-2"
        />
      </label>
    </div>

    {#if (!debouncedSearch || filteredMatches.length) && upcomingMatches.length}
      {@const isToggled = matchToggleState.includes("upcoming") || debouncedSearch}

      <div class="@container flex flex-col space-y-2" transition:slide>
        <Button
          onclick={() => {
            if (debouncedSearch) return;
            if (matchToggleState.includes("upcoming")) {
              matchToggleState = matchToggleState.filter((val) => val != "upcoming");
            } else {
              matchToggleState.push("upcoming");
            }
          }}
        >
          <ChevronRightIcon class="text-theme transition-[rotate] {isToggled ? 'rotate-90' : 'rotate-0'}" />
          <div class="flex grow items-center justify-between">
            <span class={matchToggleState.includes("upcoming") ? "font-bold" : "font-light"}>Upcoming</span>
            <div class="flex gap-0.5 text-sm">
              {upcomingMatches.length}<ListOrderedIcon class="size-4" />
            </div>
          </div>
        </Button>

        {#if isToggled}
          <div class="flex flex-col gap-2" transition:slide>
            {#each upcomingMatches as match ([match.level || "qm", match.set || 1, match.number].join("-"))}
              {@render matchRow(match)}
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#if (!debouncedSearch || filteredMatches.length) && previousMatches.length}
      {@const isToggled = matchToggleState.includes("previous") || debouncedSearch}

      <div class="@container flex flex-col space-y-2" transition:slide>
        <Button
          onclick={() => {
            if (debouncedSearch) return;
            if (matchToggleState.includes("previous")) {
              matchToggleState = matchToggleState.filter((val) => val != "previous");
            } else {
              matchToggleState.push("previous");
            }
          }}
        >
          <ChevronRightIcon class="text-theme transition-[rotate] {isToggled ? 'rotate-90' : 'rotate-0'}" />
          <div class="flex grow items-center justify-between">
            <span class={matchToggleState.includes("previous") ? "font-bold" : "font-light"}>Previous</span>
            <div class="flex gap-0.5 text-sm">
              {previousMatches.length}<ListOrderedIcon class="size-4" />
            </div>
          </div>
        </Button>

        {#if isToggled}
          <div class="flex flex-col gap-2" transition:slide>
            {#each previousMatches as match ([match.level || "qm", match.set || 1, match.number].join("-"))}
              {@render matchRow(match)}
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {/if}

  <div
    class="sticky right-3 bottom-20 z-20 mr-2 flex flex-col self-end border border-neutral-500 bg-neutral-900 p-2 shadow-2xl lg:bottom-8"
  >
    <Button
      onclick={() =>
        openDialog(EditMatchDialog, {
          comp: data.compRecord,
          onupdate(match) {
            let matches = $state.snapshot(data.compRecord.matches);
            matches = matches.filter((m) => compareMatches(m, match) != 0);
            matches.push(match);
            matches = matches.toSorted(compareMatches);

            data = {
              ...data,
              compRecord: { ...data.compRecord, matches, modified: new Date() },
            };
            idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = invalidateAll;
          },
        })}
      class="text-sm"
    >
      <PlusIcon class="text-theme size-5" />
      <span class="hidden sm:block">New match</span>
    </Button>
  </div>
</div>

{#snippet matchRow(match: Match & { extraTeams?: string[] })}
  <Anchor route={matchUrl(match, data.compRecord.id)} class="text-center!">
    <div class="flex flex-wrap items-center gap-x-4">
      {#if match.red1 || match.red2 || match.red3}
        {@const redWon =
          match.redScore !== undefined && match.blueScore !== undefined ? match.redScore > match.blueScore : undefined}

        <div class="text-red flex flex-col gap-x-2 {allianceFontWeight(redWon)} @lg:flex-row @lg:flex-wrap">
          {#if match.red1}
            <div class="min-w-13 {teamSearchFontWeight(match.red1)}">{match.red1}</div>
          {/if}
          {#if match.red2}
            <div class="min-w-13 {teamSearchFontWeight(match.red2)}">{match.red2}</div>
          {/if}
          {#if match.red3}
            <div class="min-w-13 {teamSearchFontWeight(match.red3)}">{match.red3}</div>
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
        {@const blueWon =
          match.redScore !== undefined && match.blueScore !== undefined ? match.redScore < match.blueScore : undefined}

        <div class="text-blue flex flex-col gap-x-2 {allianceFontWeight(blueWon)} @lg:flex-row @lg:flex-wrap">
          {#if match.blue1}
            <div class="min-w-13 {teamSearchFontWeight(match.blue1)}">{match.blue1}</div>
          {/if}
          {#if match.blue2}
            <div class="min-w-13 {teamSearchFontWeight(match.blue2)}">{match.blue2}</div>
          {/if}
          {#if match.blue3}
            <div class="min-w-13 {teamSearchFontWeight(match.blue3)}">{match.blue3}</div>
          {/if}
        </div>
      {/if}

      {#if match.extraTeams?.length}
        <div class="flex flex-col gap-x-2 @lg:flex-row @lg:flex-wrap">
          {#each match.extraTeams as extraTeam}
            <div class="min-w-13 {teamSearchFontWeight(extraTeam)}">{extraTeam}</div>
          {/each}
        </div>
      {/if}
    </div>
  </Anchor>
{/snippet}
