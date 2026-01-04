<script lang="ts">
  import { ChevronRightIcon, ListOrderedIcon, PlusIcon, SearchIcon } from "@lucide/svelte";
  import { afterNavigate, goto } from "$app/navigation";
  import { compareMatches, matchUrl, rerunAllContextLoads, type Match } from "$lib";
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import EditMatchDialog from "$lib/dialogs/EditMatchDialog.svelte";
  import { idb } from "$lib/idb";
  import { teamStore } from "$lib/settings";
  import { slide } from "svelte/transition";
  import { z } from "zod";
  import type { LayoutProps } from "./$types";

  let { data, children }: LayoutProps = $props();

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

  afterNavigate(({ from, to }) => {
    if (!data.match) return;
    const [fromId, toId] = [from?.route.id, to?.route.id];
    const baseRouteId = "/comp/[compId]/(main)/matches";
    if (fromId == toId || (fromId?.startsWith(baseRouteId) && toId?.startsWith(baseRouteId))) return;

    document
      .getElementById([data.match.level || "qm", data.match.set || 1, data.match.number].join("-"))
      ?.scrollIntoView({ block: "center", inline: "center" });
  });
</script>

<div
  class={[
    "lg:fixed lg:top-[57px] lg:h-[calc(100vh-57px)] lg:w-[280px] lg:overflow-y-auto lg:overscroll-y-contain lg:border-r lg:border-neutral-600 2xl:w-lg",
    "max-lg:mx-auto max-lg:w-full max-lg:max-w-(--breakpoint-lg)",
    data.match ? "max-lg:hidden" : "max-lg:mb-[65px]",
  ]}
>
  <div class={["flex flex-col gap-3 bg-neutral-900 px-3 py-6", "sticky top-[57px] z-20 lg:top-0", "max-lg:mt-[57px]"]}>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="grow font-bold">Matches</h2>

      <div class="flex items-center gap-3">
        {#if data.matches.length}
          <label
            class={[
              "flex cursor-text items-center gap-2 bg-neutral-800 p-2 text-sm text-theme outline-neutral-300",
              "focus-within:z-10 focus-within:outline-2",
            ]}
          >
            <SearchIcon class="size-5 text-theme" />
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
              class="w-full max-w-32 min-w-8 font-bold outline-0"
            />
          </label>
        {:else}
          <span class="text-xs">No matches.</span>
        {/if}

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
                idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = rerunAllContextLoads;
              },
            })}
        >
          <PlusIcon class="size-5 text-theme" />
        </Button>
      </div>
    </div>
  </div>

  {#if data.matches.length}
    <div class="mb-6 flex flex-col gap-6 px-3 pt-1">
      {#if (!debouncedSearch || filteredMatches.length) && upcomingMatches.length}
        {@const isToggled = matchToggleState.includes("upcoming") || debouncedSearch}

        <div class="flex flex-col space-y-2" transition:slide>
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

        <div class="flex flex-col space-y-2" transition:slide>
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
    </div>
  {/if}
</div>

{@render children()}

{#snippet matchRow(match: Match & { extraTeams?: string[] })}
  {@const viewing = !!data.match && compareMatches(match, data.match) == 0}

  <Anchor
    route={matchUrl(match, data.compRecord.id)}
    id={[match.level || "qm", match.set || 1, match.number].join("-")}
    class="flex-col justify-center gap-1! text-center!"
  >
    <div class="flex flex-wrap items-center gap-x-4">
      {#if match.red1 || match.red2 || match.red3}
        {@const redWon =
          match.redScore !== undefined && match.blueScore !== undefined ? match.redScore > match.blueScore : undefined}

        <div
          class={[
            "flex flex-col gap-x-2 text-red 2xl:flex-row",
            allianceFontWeight(redWon),
            !data.match && "sm:flex-row lg:flex-col",
          ]}
        >
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
          <div class={["min-w-8", viewing ? "font-bold italic underline underline-offset-4" : "font-light"]}>
            {#if match.level && match.level != "qm"}
              {match.level}{match.set || 1}-{match.number}
            {:else}
              {match.number}
            {/if}
          </div>
          <div class="flex items-center gap-x-2">
            <div
              class={[
                "min-w-8 text-red",
                redWon || viewing ? "font-bold" : "text-sm font-light",
                viewing && "italic underline underline-offset-4",
              ]}
            >
              {match.redScore}
            </div>
            <div
              class={[
                "min-w-8 text-blue",
                blueWon || viewing ? "font-bold" : "text-sm font-light",
                viewing && "italic underline underline-offset-4",
              ]}
            >
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

        <div
          class={[
            "flex flex-col gap-x-2 text-blue 2xl:flex-row",
            allianceFontWeight(blueWon),
            !data.match && "sm:flex-row lg:flex-col",
          ]}
        >
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
    </div>

    {#if match.extraTeams?.length}
      <div class="flex flex-wrap gap-x-2 text-sm font-light">
        {#each match.extraTeams as extraTeam}
          <div class="min-w-13 {teamSearchFontWeight(extraTeam)}">{extraTeam}</div>
        {/each}
      </div>
    {/if}
  </Anchor>
{/snippet}
