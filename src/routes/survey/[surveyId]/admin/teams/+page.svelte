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
  import { flushSync, onMount } from "svelte";
  import { SvelteSet } from "svelte/reactivity";
  import type { PageData } from "./$types";
  import { objectStore } from "$lib/idb";
  import AdminHeader from "../AdminHeader.svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  let teamsFromMatches = $derived.by(() => {
    data.surveyRecord;
    return getTeamsFromMatches();
  });
  let matchCountPerTeam = $derived(getMatchCountPerTeam(teamsFromMatches));
  let entriesByTeam = $derived.by(() => {
    data.surveyRecord;
    data.entryRecords;
    return getEntriesByTeam();
  });

  let dataGrid = $state<HTMLDivElement | undefined>();

  let ranksPerPickList = $derived.by(() => {
    if (data.surveyType != "match") return [];
    return data.surveyRecord.pickLists.map(createTeamRanking);
  });

  let sortBy = $state<"team" | number | "done">("team");

  let selecting = $state(false);
  let selectedTeams = new SvelteSet<string>();

  let columns = $derived(data.surveyType == "match" ? data.surveyRecord.pickLists.length + 3 : 3);

  let matchTeamInfos = $derived([...new Set(teamsFromMatches)].map(createTeamInfo).toSorted(sortTeamInfo));
  let customTeamInfos = $derived(data.surveyRecord.teams.map(createTeamInfo).toSorted(sortTeamInfo));

  let conflictingTeams = $derived([...new Set(data.surveyRecord.teams).intersection(new Set(teamsFromMatches))]);

  let displayedCount = $state(10);
  let displayedTeams = $derived(customTeamInfos.slice(0, displayedCount));

  onMount(() => onscroll());

  $effect(() => {
    if (!dataGrid) return;
    sortBy;
    if (window.scrollY > dataGrid.getBoundingClientRect().top) {
      dataGrid.scrollIntoView();
    }
  });

  function onscroll() {
    if (displayedCount >= customTeamInfos.length) return;
    if (document.body.offsetHeight <= window.scrollY + window.innerHeight * 2) {
      displayedCount = Math.min(displayedCount + 10, customTeamInfos.length);
      flushSync();
      onscroll();
    }
  }

  function getTeamsFromMatches() {
    if (data.surveyType != "match" || !data.surveyRecord.matches.length) return [];
    const teamsFromMatches: string[] = [];
    for (const match of data.surveyRecord.matches) {
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
    for (const entry of data.entryRecords) {
      if (entry.team in entriesByTeam) {
        entriesByTeam[entry.team].push(entry);
      } else {
        entriesByTeam[entry.team] = [entry];
      }
    }
    return entriesByTeam;
  }

  function createTeamRanking(pickList: PickList) {
    if (data.surveyType != "match") return {};

    const pickListData: Record<string, number> = {};
    for (const team in entriesByTeam) {
      pickListData[team] = 0;
    }

    for (const { percentage, expressionName } of pickList.weights) {
      const teamData = calculateTeamData(expressionName, data.surveyRecord.expressions, entriesByTeam, data.fields);
      const normalizedTeamData = normalizeTeamData(teamData, percentage);

      for (const team in normalizedTeamData) {
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
    const matchingEntries = data.entryRecords.filter((entry) => entry.status != "draft" && entry.team == team);

    let pickListRanks: number[] | undefined = undefined;
    if (ranksPerPickList.length) {
      pickListRanks = ranksPerPickList.map((pickList) => pickList[team]);
    }

    return {
      team,
      entryCount: matchingEntries.length,
      matchCount: matchCountPerTeam[team] ?? 0,
      isCustom: data.surveyRecord.teams.includes(team),
      pickListRanks,
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
    data = {
      ...data,
      surveyRecord: {
        ...data.surveyRecord,
        teams: data.surveyRecord.teams.filter((team) => !conflictingTeams.includes(team)),
        modified: new Date(),
      },
    } as PageData;
    objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
  }

  function getOrdinal(n: number) {
    if (n % 10 == 1 && n % 100 != 11) return "st";
    if (n % 10 == 2 && n % 100 != 12) return "nd";
    if (n % 10 == 3 && n % 100 != 13) return "rd";
    return "th";
  }
</script>

<svelte:window {onscroll} />

<div class="flex flex-col gap-6" style="view-transition-name:admin">
  <AdminHeader surveyRecord={data.surveyRecord} page="teams" />

  <div class="flex flex-wrap gap-3">
    {#if matchTeamInfos.length}
      <div class="flex grow basis-0 flex-col gap-2">
        <h2 class="font-bold">Match Teams</h2>
        <div class="flex flex-col">
          <small>
            Sorting by
            {#if data.surveyType == "match" && typeof sortBy == "number"}
              {data.surveyRecord.pickLists[sortBy].name}
            {:else}
              {sortBy}
            {/if}
          </small>

          <div class="grid gap-2 pt-1" style="grid-template-columns: repeat({columns}, min-content) auto;">
            <div class="sticky top-0 z-20 col-span-full grid grid-cols-subgrid bg-neutral-900 py-2">
              <div class="grid grid-cols-subgrid" style="grid-column: span {columns} / span {columns}">
                <Button onclick={() => (sortBy = "team")} class={sortBy == "team" ? "font-bold" : "font-light"}>
                  Team
                </Button>

                {#if ranksPerPickList.length && data.surveyType == "match"}
                  {#each data.surveyRecord.pickLists as pickList, i}
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

            {#each matchTeamInfos as teamInfo (teamInfo.team)}
              <Button
                onclick={() => {
                  openDialog(ViewTeamDialog, {
                    data,
                    teamInfo,
                    ondelete() {
                      data = {
                        ...data,
                        surveyRecord: {
                          ...data.surveyRecord,
                          teams: data.surveyRecord.teams.filter((team) => teamInfo.team != team),
                          modified: new Date(),
                        },
                      } as PageData;
                      objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
                    },
                  });
                }}
                class="col-span-full grid grid-cols-subgrid text-center"
              >
                <div>{teamInfo.team}</div>

                {#if teamInfo.pickListRanks?.length}
                  {#each teamInfo.pickListRanks as pickListRank}
                    <div>
                      {#if pickListRank > 0}
                        {pickListRank}<small class="font-light">{getOrdinal(pickListRank)}</small>
                      {/if}
                    </div>
                  {/each}
                {/if}

                <div>
                  {#if data.surveyType == "match" && data.surveyRecord.matches.length && teamInfo.matchCount}
                    {teamInfo.entryCount}<small class="font-light">/{teamInfo.matchCount}</small>
                  {:else}
                    {teamInfo.entryCount}
                  {/if}
                </div>
              </Button>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <div class="flex grow basis-0 flex-col gap-2">
      <h2 class="font-bold">Custom Teams</h2>
      <Button
        onclick={() =>
          openDialog(AddTeamsDialog, {
            allTeams: customTeamInfos,
            onadd(teams) {
              data = {
                ...data,
                surveyRecord: {
                  ...data.surveyRecord,
                  teams: [...data.surveyRecord.teams, ...teams],
                  modified: new Date(),
                },
              } as PageData;
              objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
            },
          })}
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

      {#if data.surveyRecord.teams.length}
        <div class="flex flex-col gap-2">
          {#if selecting}
            {@const deletableTeams = [...selectedTeams].filter((team) => data.surveyRecord.teams.includes(team))}

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

            <span>{selectedTeams.size} <small>selected</small></span>

            <Button
              disabled={deletableTeams.length == 0}
              onclick={() => {
                openDialog(DeleteTeamsDialog, {
                  teams: deletableTeams,
                  ondelete(teams) {
                    data = {
                      ...data,
                      surveyRecord: {
                        ...data.surveyRecord,
                        teams: data.surveyRecord.teams.filter((team) => !teams.includes(team)),
                        modified: new Date(),
                      },
                    } as PageData;
                    objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
                  },
                });
              }}
              class="flex-nowrap text-nowrap"
            >
              <Icon name="trash" />
              Delete {deletableTeams.length || ""}
            </Button>
          {:else}
            <Button onclick={() => (selecting = true)} class="flex-nowrap text-nowrap">
              <Icon name="check" />
              Select
            </Button>
          {/if}
        </div>
      {/if}

      {#if customTeamInfos.length}
        <div class="flex flex-col">
          <small>
            Sorting by
            {#if data.surveyType == "match" && typeof sortBy == "number"}
              {data.surveyRecord.pickLists[sortBy].name}
            {:else}
              {sortBy}
            {/if}
          </small>

          <div
            bind:this={dataGrid}
            class="grid gap-2 pt-1"
            style="grid-template-columns: repeat({columns}, min-content) auto;"
          >
            <div class="sticky top-0 z-20 col-span-full grid grid-cols-subgrid bg-neutral-900 py-2">
              {#if selecting}
                <Button
                  onclick={() => {
                    if (selectedTeams.size == customTeamInfos.length) {
                      selectedTeams.clear();
                    } else {
                      for (const { team } of customTeamInfos) {
                        selectedTeams.add(team);
                      }
                    }
                  }}
                >
                  {#if selectedTeams.size == customTeamInfos.length}
                    <Icon name="square-check" />
                  {:else}
                    <Icon style="regular" name="square" />
                  {/if}
                </Button>
              {/if}

              <div class="grid grid-cols-subgrid" style="grid-column: span {columns} / span {columns}">
                <Button onclick={() => (sortBy = "team")} class={sortBy == "team" ? "font-bold" : "font-light"}>
                  Team
                </Button>

                {#if ranksPerPickList.length && data.surveyType == "match"}
                  {#each data.surveyRecord.pickLists as pickList, i}
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
                    openDialog(ViewTeamDialog, {
                      data,
                      teamInfo,
                      ondelete() {
                        data = {
                          ...data,
                          surveyRecord: {
                            ...data.surveyRecord,
                            teams: data.surveyRecord.teams.filter((team) => teamInfo.team != team),
                            modified: new Date(),
                          },
                        } as PageData;
                        objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
                      },
                    });
                  }
                }}
                class="col-span-full grid grid-cols-subgrid text-center {defaultFont}"
              >
                {#if selecting}
                  <div class="h-[24px] text-left">
                    {#if selectedTeams.has(teamInfo.team)}
                      <Icon name="square-check" />
                    {:else}
                      <Icon style="regular" name="square" />
                    {/if}
                  </div>
                {/if}

                <div>{teamInfo.team}</div>

                {#if teamInfo.pickListRanks?.length}
                  {#each teamInfo.pickListRanks as pickListRank}
                    <div>
                      {#if pickListRank > 0}
                        {pickListRank}<small class="font-light">{getOrdinal(pickListRank)}</small>
                      {/if}
                    </div>
                  {/each}
                {/if}

                <div>
                  {#if data.surveyType == "match" && data.surveyRecord.matches.length && teamInfo.matchCount}
                    {teamInfo.entryCount}<small class="font-light">/{teamInfo.matchCount}</small>
                  {:else}
                    {teamInfo.entryCount}
                  {/if}
                </div>
              </Button>
            {/each}
          </div>

          {#if displayedTeams.length < customTeamInfos.length}
            <Button onclick={() => (displayedCount += 10)}>
              <Icon name="arrow-down" />
              Show more
            </Button>
          {/if}
        </div>
      {:else}
        <small>No custom teams.</small>
        <small>
          {#if matchTeamInfos.length}
            Match teams are used depending on the selected target.
          {:else}
            Any team value is allowed.
          {/if}
        </small>
      {/if}
    </div>
  </div>
</div>
