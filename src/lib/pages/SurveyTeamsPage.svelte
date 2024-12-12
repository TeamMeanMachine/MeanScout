<script lang="ts">
  import type { TeamInfo } from "$lib";
  import { calculateTeamData, normalizeTeamData, type PickList } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import AddTeamsDialog from "$lib/dialogs/AddTeamsDialog.svelte";
  import DeleteTeamsDialog from "$lib/dialogs/DeleteTeamsDialog.svelte";
  import ViewTeamDialog from "$lib/dialogs/ViewTeamDialog.svelte";
  import type { Entry } from "$lib/entry";
  import { getDetailedSingleFields, type Field } from "$lib/field";
  import { modeStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";
  import { flushSync, onMount } from "svelte";
  import { SvelteSet } from "svelte/reactivity";

  let {
    surveyRecord,
    fieldRecords,
    entryRecords,
  }: {
    surveyRecord: IDBRecord<Survey>;
    fieldRecords: IDBRecord<Field>[];
    entryRecords: IDBRecord<Entry>[];
  } = $props();

  const fields = getDetailedSingleFields(surveyRecord, fieldRecords);

  const teamsFromMatches = getTeamsFromMatches();
  const matchCountPerTeam = getMatchCountPerTeam(teamsFromMatches);
  const entriesByTeam = getEntriesByTeam();

  let dataGrid = $state<HTMLDivElement | undefined>();

  let ranksPerPickList = $derived.by(() => {
    if (surveyRecord.type != "match") return [];
    surveyRecord.skippedTeams;
    return surveyRecord.pickLists.map(createTeamRanking);
  });

  let sortBy = $state<"team" | number | "done">("team");

  let selecting = $state(false);
  let selectedTeams = new SvelteSet<string>();

  let columns = $derived(surveyRecord.type == "match" ? surveyRecord.pickLists.length + 3 : 3);

  let teamInfos = $derived.by(() => {
    const uniqueTeams = [...new Set([...surveyRecord.teams, ...teamsFromMatches])];
    return uniqueTeams.map(createTeamInfo).toSorted(sortTeamInfo);
  });

  let conflictingTeams = $derived([...new Set(surveyRecord.teams).intersection(new Set(teamsFromMatches))]);

  let displayedCount = $state(10);
  let displayedTeams = $derived(teamInfos.slice(0, displayedCount));

  onMount(() => onscroll());

  $effect(() => {
    if (!dataGrid) return;
    sortBy;
    if (window.scrollY > dataGrid.getBoundingClientRect().top) {
      dataGrid.scrollIntoView();
    }
  });

  function onscroll() {
    if (displayedCount >= teamInfos.length) return;
    if (document.body.offsetHeight <= window.scrollY + window.innerHeight * 2) {
      displayedCount = Math.min(displayedCount + 10, teamInfos.length);
      flushSync();
      onscroll();
    }
  }

  function getTeamsFromMatches() {
    if (surveyRecord.type != "match" || !surveyRecord.matches.length) return [];
    const teamsFromMatches: string[] = [];
    for (const match of surveyRecord.matches) {
      teamsFromMatches.push(match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3);
    }
    return teamsFromMatches;
  }

  function getMatchCountPerTeam(teamsFromMatches: string[]) {
    const matchCountPerTeam: Record<string, number> = {};
    for (const team of teamsFromMatches) {
      if (team in matchCountPerTeam) {
        matchCountPerTeam[team] += 1;
      } else {
        matchCountPerTeam[team] = 1;
      }
    }
    return matchCountPerTeam;
  }

  function getEntriesByTeam() {
    const entriesByTeam: Record<string, IDBRecord<Entry>[]> = {};
    for (const entry of entryRecords) {
      if (entry.team in entriesByTeam) {
        entriesByTeam[entry.team].push(entry);
      } else {
        entriesByTeam[entry.team] = [entry];
      }
    }
    return entriesByTeam;
  }

  function createTeamRanking(pickList: PickList) {
    if (surveyRecord.type != "match") return {};

    const pickListData: Record<string, number> = {};
    for (const team in entriesByTeam) {
      if (surveyRecord.skippedTeams?.includes(team)) continue;
      pickListData[team] = 0;
    }

    for (const { percentage, expressionName } of pickList.weights) {
      const teamData = calculateTeamData(expressionName, surveyRecord.expressions, entriesByTeam, fields);
      const normalizedTeamData = normalizeTeamData(teamData, percentage);

      for (const team in normalizedTeamData) {
        if (surveyRecord.skippedTeams?.includes(team)) continue;
        pickListData[team] += normalizedTeamData[team];
      }
    }

    const normalizedPickListData = normalizeTeamData(pickListData);

    const sortedTeamRankings = Object.keys(pickListData)
      .map((team) => ({ team, percentage: normalizedPickListData[team] }))
      .toSorted((a, b) => b.percentage - a.percentage)
      .map((data, index) => ({ team: data.team, rank: index + 1 }));

    const rankPerTeam: Record<string, number> = {};
    for (const ranking of sortedTeamRankings) {
      rankPerTeam[ranking.team] = ranking.rank;
    }
    return rankPerTeam;
  }

  function createTeamInfo(team: string): TeamInfo {
    const matchingEntries = entryRecords.filter((entry) => entry.status != "draft" && entry.team == team);

    let skipped: boolean | undefined = undefined;
    if (surveyRecord.type == "match" && surveyRecord.skippedTeams?.includes(team)) {
      skipped = true;
    }

    let pickListRanks: number[] | undefined = undefined;
    if (ranksPerPickList.length) {
      pickListRanks = ranksPerPickList.map((pickList) => (skipped ? 0 : pickList[team]));
    }

    return {
      team,
      entryCount: matchingEntries.length,
      matchCount: matchCountPerTeam[team] ?? 0,
      isCustom: surveyRecord.teams.includes(team),
      pickListRanks,
      skipped,
    };
  }

  function sortTeamInfo(a: TeamInfo, b: TeamInfo) {
    const teamCompare = a.team.localeCompare(b.team, "en", { numeric: true });
    const doneCompare = a.entryCount / a.matchCount - b.entryCount / b.matchCount;

    if (typeof sortBy == "number" && a.pickListRanks?.length && b.pickListRanks?.length) {
      const aRank = a.pickListRanks[sortBy];
      const bRank = b.pickListRanks[sortBy];

      if (aRank == 0 && bRank > 0) return 1;
      if (aRank > 0 && bRank == 0) return -1;
      return aRank - bRank;
    }

    if (sortBy == "done") return doneCompare || teamCompare;
    return teamCompare;
  }

  function fixTeams() {
    surveyRecord.teams = surveyRecord.teams.filter((team) => !conflictingTeams.includes(team));
    surveyRecord.modified = new Date();
  }

  function skipTeams() {
    if (!selectedTeams.size || surveyRecord.type != "match") return;
    if (surveyRecord.skippedTeams == undefined) surveyRecord.skippedTeams = [...selectedTeams];
    else surveyRecord.skippedTeams.push(...selectedTeams);
    surveyRecord.modified = new Date();
  }

  function unskipTeams() {
    if (!selectedTeams.size || surveyRecord.type != "match") return;
    const remainingTeams = surveyRecord.skippedTeams?.filter((t) => !selectedTeams.has(t));
    if (!remainingTeams || remainingTeams.length == 0) surveyRecord.skippedTeams = undefined;
    surveyRecord.skippedTeams = remainingTeams;
    surveyRecord.modified = new Date();
  }

  function getOrdinal(n: number) {
    if (n % 10 == 1 && n % 100 != 11) return "st";
    if (n % 10 == 2 && n % 100 != 12) return "nd";
    if (n % 10 == 3 && n % 100 != 13) return "rd";
    return "th";
  }
</script>

<svelte:window {onscroll} />

<div class="flex flex-wrap gap-x-3">
  {#if $modeStore == "admin"}
    <div class="grow basis-0">
      <div class="sticky top-0 flex flex-col gap-2 bg-neutral-900 pt-2">
        <Button
          onclick={() => openDialog(AddTeamsDialog, { surveyRecord, allTeams: teamInfos })}
          class="flex-nowrap text-nowrap"
        >
          <Icon name="plus" />
          Add team(s)
        </Button>

        {#if conflictingTeams.length}
          <Button onclick={fixTeams} class="flex-nowrap text-nowrap">
            <Icon name="wrench" />
            <div class="flex flex-col">
              Fix teams
              <small class="text-wrap">{conflictingTeams.length} custom teams were found in matches</small>
            </div>
          </Button>
        {/if}

        <div class="flex flex-col gap-2">
          {#if selecting}
            {@const deletableTeams = [...selectedTeams].filter((team) => surveyRecord.teams.includes(team))}

            <span>{selectedTeams.size} <small>selected</small></span>

            {#if surveyRecord.type == "match"}
              {@const canSkipTeams = [...selectedTeams].filter((team) => !surveyRecord.skippedTeams?.includes(team))}
              {@const canUnskipTeams = [...selectedTeams].filter((team) => surveyRecord.skippedTeams?.includes(team))}

              {#if canUnskipTeams.length}
                <Button onclick={unskipTeams} class="flex-nowrap text-nowrap">
                  <Icon name="backward" />
                  Unskip {canUnskipTeams.length || ""}
                </Button>
              {:else}
                <Button disabled={!canSkipTeams.length} onclick={skipTeams} class="flex-nowrap text-nowrap">
                  <Icon name="forward" />
                  Skip {canSkipTeams.length || ""}
                </Button>
              {/if}
            {/if}

            <Button
              disabled={deletableTeams.length == 0}
              onclick={() => {
                openDialog(DeleteTeamsDialog, { surveyRecord, teams: deletableTeams });
              }}
              class="flex-nowrap text-nowrap"
            >
              <Icon name="trash" />
              Delete {deletableTeams.length || ""}
            </Button>

            <Button
              onclick={() => {
                selecting = false;
                selectedTeams.clear();
              }}
              class="flex-nowrap text-nowrap"
            >
              <Icon name="xmark" />
              Cancel
            </Button>
          {:else}
            <Button onclick={() => (selecting = true)} class="flex-nowrap text-nowrap">
              <Icon name="check" />
              Select
            </Button>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <div class="flex grow flex-col gap-2 pt-2">
    {#if teamInfos.length}
      <div class="flex flex-col">
        {#if surveyRecord.type == "match"}
          <small>{surveyRecord.skippedTeams?.length || 0} skipped</small>
        {/if}
        <small>
          Sorting by
          {#if surveyRecord.type == "match" && typeof sortBy == "number"}
            {surveyRecord.pickLists[sortBy].name}
          {:else}
            {sortBy}
          {/if}
        </small>

        <div
          bind:this={dataGrid}
          class="grid gap-y-2 pt-1"
          style="grid-template-columns: repeat({columns}, min-content) auto;"
        >
          <div class="sticky top-0 z-20 col-span-full grid grid-cols-subgrid bg-neutral-900 py-2">
            {#if selecting}
              <Button
                onclick={() => {
                  if (selectedTeams.size == teamInfos.length) {
                    selectedTeams.clear();
                  } else {
                    for (const { team } of teamInfos) {
                      selectedTeams.add(team);
                    }
                  }
                }}
              >
                {#if selectedTeams.size == teamInfos.length}
                  <Icon name="square-check" />
                {:else}
                  <Icon style="regular" name="square" />
                {/if}
              </Button>
            {:else}
              <div class="w-[41px]"></div>
            {/if}

            <div class="grid grid-cols-subgrid" style="grid-column: span {columns} / span {columns}">
              <Button onclick={() => (sortBy = "team")} class={sortBy == "team" ? "font-bold" : "font-light"}>
                Team
              </Button>

              {#if ranksPerPickList.length && surveyRecord.type == "match"}
                {#each surveyRecord.pickLists as pickList, i}
                  <Button onclick={() => (sortBy = i)} class="{sortBy == i ? 'font-bold' : 'font-light'} text-xs">
                    {pickList.name}
                  </Button>
                {/each}
              {/if}

              <Button onclick={() => (sortBy = "done")} class={sortBy == "done" ? "font-bold" : "font-light"}>
                Done
              </Button>
            </div>
          </div>

          {#each displayedTeams as teamInfo (teamInfo.team)}
            {@const defaultFont = selectedTeams.has(teamInfo.team) ? "font-bold" : ""}

            <Button
              onclick={() => {
                if (selecting) {
                  if (selectedTeams.has(teamInfo.team)) {
                    selectedTeams.delete(teamInfo.team);
                  } else {
                    selectedTeams.add(teamInfo.team);
                  }
                } else {
                  openDialog(ViewTeamDialog, { surveyRecord, fieldRecords, entryRecords, teamInfo, canEdit: true });
                }
              }}
              class="col-span-full grid grid-cols-subgrid text-center {defaultFont}"
            >
              <div class="h-[24px] text-left">
                {#if selecting}
                  {#if selectedTeams.has(teamInfo.team)}
                    <Icon name="square-check" />
                  {:else}
                    <Icon style="regular" name="square" />
                  {/if}
                {/if}
              </div>

              <div>{teamInfo.team}</div>

              {#if teamInfo.pickListRanks?.length}
                {#if teamInfo.skipped}
                  {@const borderColor = selectedTeams.has(teamInfo.team) ? "border-neutral-200" : "border-neutral-500"}
                  {@const gridColumn = `span ${teamInfo.pickListRanks.length}`}
                  <hr class="mx-4 {borderColor}" style="grid-column: {gridColumn} / {gridColumn}" />
                {:else}
                  {#each teamInfo.pickListRanks as pickListRank}
                    <div>
                      {#if pickListRank > 0}
                        {pickListRank}<small class="font-light">{getOrdinal(pickListRank)}</small>
                      {/if}
                    </div>
                  {/each}
                {/if}
              {/if}

              <div>
                {#if surveyRecord.type == "match" && surveyRecord.matches.length && teamInfo.matchCount}
                  {teamInfo.entryCount}<small class="font-light">/{teamInfo.matchCount}</small>
                {:else}
                  {teamInfo.entryCount}
                {/if}
              </div>
            </Button>
          {/each}
        </div>

        {#if displayedTeams.length < teamInfos.length}
          <Button onclick={() => (displayedCount += 10)}>
            <Icon name="arrow-down" />
            Show more
          </Button>
        {/if}
      </div>
    {:else}
      <span>
        No teams.
        {#if surveyRecord.type == "match" && surveyRecord.matches.length}
          Note that teams from matches are used depending on the selected target.
        {:else}
          Any team value is allowed.
        {/if}
      </span>
    {/if}
  </div>
</div>
